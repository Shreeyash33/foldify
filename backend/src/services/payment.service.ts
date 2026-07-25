import crypto from 'node:crypto';
import type { PaymentInitiation, PaymentVerification } from '@foldify/shared';

/**
 * Simulated payment gateway.
 *
 * TODO(payments): replace both functions with the eSewa or Khalti sandbox.
 *   - eSewa:  https://developer.esewa.com.np/  (form POST + signature)
 *   - Khalti: https://docs.khalti.com/         (JSON API + server-side lookup)
 * Keep these signatures. The checkout flow should not need to change when the
 * real gateway lands — only the bodies of these two functions.
 *
 * Whatever gateway wins, verification MUST happen server-side against the
 * provider. Never trust an amount or a success flag posted back by the browser.
 */

const PENDING = new Map<string, { amountMinor: number; createdAt: number }>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initiate(amountMinor: number, orderId: number): Promise<PaymentInitiation> {
  await delay(400); // pretend there is a network

  const reference = `SIM-${orderId}-${crypto.randomBytes(6).toString('hex')}`;
  PENDING.set(reference, { amountMinor, createdAt: Date.now() });

  return {
    reference,
    // In the real integration this is the provider's hosted checkout URL.
    redirectUrl: `/checkout/simulated?ref=${encodeURIComponent(reference)}`,
    amountMinor,
    provider: 'simulated',
  };
}

export async function verify(reference: string): Promise<PaymentVerification> {
  await delay(400);

  const record = PENDING.get(reference);
  const status: PaymentVerification['status'] = record === undefined ? 'failed' : 'success';

  if (record !== undefined) PENDING.delete(reference);

  return { reference, status, verifiedAt: new Date().toISOString() };
}
