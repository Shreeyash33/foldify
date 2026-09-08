import crypto from 'node:crypto';
import type { PaymentInitiation, PaymentVerification } from '@foldify/shared';
import { config } from '../config.ts';

/**
 * Khalti payment gateway integration.
 *
 * When KHALTI_SECRET_KEY is set, initiates and verifies real Khalti sandbox
 * payments via the epayment JSON API. When the key is blank, falls back to a
 * simulated in-memory gateway for local development.
 *
 * Whatever gateway wins, verification MUST happen server-side against the
 * provider. Never trust an amount or a success flag posted back by the browser.
 */

const PENDING = new Map<string, { amountMinor: number; createdAt: number }>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/*  Simulated fallback (used when KHALTI_SECRET_KEY is unset)                  */
/* -------------------------------------------------------------------------- */

async function simulateInitiate(amountMinor: number, orderId: number): Promise<PaymentInitiation> {
  await delay(400);

  const reference = `SIM-${orderId}-${crypto.randomBytes(6).toString('hex')}`;
  PENDING.set(reference, { amountMinor, createdAt: Date.now() });

  return {
    reference,
    redirectUrl: `/checkout/return?ref=${encodeURIComponent(reference)}`,
    amountMinor,
    provider: 'simulated',
  };
}

async function simulateVerify(reference: string): Promise<PaymentVerification> {
  await delay(400);

  const record = PENDING.get(reference);
  const status: PaymentVerification['status'] = record === undefined ? 'failed' : 'success';

  if (record !== undefined) PENDING.delete(reference);

  return { reference, status, verifiedAt: new Date().toISOString() };
}

/* -------------------------------------------------------------------------- */
/*  Real Khalti gateway                                                        */
/* -------------------------------------------------------------------------- */

async function khaltiInitiate(amountMinor: number, orderId: number): Promise<PaymentInitiation> {
  const { khaltiSecretKey, khaltiBaseUrl, frontendOrigin } = config;

  const body = {
    return_url: `${frontendOrigin}/checkout/return`,
    website_url: frontendOrigin,
    amount: amountMinor,
    purchase_order_id: String(orderId),
    purchase_order_name: `Foldify order #${orderId}`,
  };

  const res = await fetch(`${khaltiBaseUrl}/api/v2/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${khaltiSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    console.error('[foldify] Khalti initiate failed:', res.status, json);
    throw new Error('Khalti could not start the payment. Please try again.');
  }

  if (typeof json.pidx !== 'string' || typeof json.payment_url !== 'string') {
    console.error('[foldify] Khalti initiate unexpected payload:', json);
    throw new Error('Khalti returned an unexpected response.');
  }

  return {
    reference: json.pidx,
    redirectUrl: json.payment_url,
    amountMinor,
    provider: 'khalti',
  };
}

async function khaltiVerify(reference: string): Promise<PaymentVerification> {
  const { khaltiSecretKey, khaltiBaseUrl } = config;

  const res = await fetch(`${khaltiBaseUrl}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${khaltiSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx: reference }),
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    console.error('[foldify] Khalti lookup failed:', res.status, json);
    throw new Error('The payment could not be verified with Khalti. Please try again.');
  }

  const khaltiStatus = json.status as string | undefined;

  let status: PaymentVerification['status'];
  switch (khaltiStatus) {
    case 'Completed':
      status = 'success';
      break;
    case 'Pending':
      status = 'pending';
      break;
    default:
      status = 'failed';
      break;
  }

  return { reference, status, verifiedAt: new Date().toISOString() };
}

/* -------------------------------------------------------------------------- */
/*  Public API — same signatures regardless of backend                        */
/* -------------------------------------------------------------------------- */

export async function initiate(amountMinor: number, orderId: number): Promise<PaymentInitiation> {
  return config.khaltiSecretKey
    ? khaltiInitiate(amountMinor, orderId)
    : simulateInitiate(amountMinor, orderId);
}

export async function verify(reference: string): Promise<PaymentVerification> {
  return config.khaltiSecretKey
    ? khaltiVerify(reference)
    : simulateVerify(reference);
}
