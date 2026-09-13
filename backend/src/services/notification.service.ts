import type { Order } from '@foldify/shared';
import { config } from '../config.ts';

/**
 * Order-confirmation SMS.
 *
 * Mirrors the payment service pattern: when SMS_API_URL is set it POSTs the
 * message to that provider endpoint as JSON, when it is blank it logs the
 * message under a clearly marked [foldify sms] prefix. Either way it never
 * throws to the caller — a notification that fails must not fail an order.
 *
 * The recipient is the shipping phone the customer entered at checkout, and
 * the message includes a delivery estimate derived from DELIVERY_ESTIMATE_HOURS
 * (formatted as days when it divides evenly, otherwise as hours).
 */

function formatEstimate(hours: number): string {
  if (hours % 24 === 0 && hours > 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/** The message a customer gets about a successfully placed order. */
export function buildOrderConfirmationMessage(
  order: Order,
  estimateHours: number,
): string {
  const itemLines = order.items ?? [];
  const items =
    itemLines.length === 0
      ? 'your order'
      : itemLines.length === 1
        ? itemLines[0]!.productName
        : `${itemLines.length} items`;
  const totalRupees = (order.totalMinor / 100).toFixed(2);
  return (
    `Thank you for your Foldify order #${order.id} — ${items}, ` +
    `Rs. ${totalRupees}. It should arrive in about ${formatEstimate(estimateHours)}. ` +
    `Reply STOP to unsubscribe.`
  );
}

interface SendSmsInput {
  order: Order;
  deliveryEstimateHours: number;
}

/**
 * Sends the order-confirmation SMS to the order's shipping phone. Best effort:
 * simulated mode logs the message, provider mode POSTs to SMS_API_URL, and a
 * provider failure is logged and swallowed so the checkout response is never
 * delayed or broken by a notification hiccup.
 */
export async function sendOrderConfirmationSms(input: SendSmsInput): Promise<void> {
  const phone = input.order.shippingPhone;
  const message = buildOrderConfirmationMessage(input.order, input.deliveryEstimateHours);
  const { smsApiUrl = '', smsApiKey = '' } = process.env;

  try {
    if (smsApiUrl === '') {
      console.log(`[foldify sms] (simulated) To ${phone}: ${message}`);
      return;
    }

    const res = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(smsApiKey !== '' ? { Authorization: `Bearer ${smsApiKey}` } : {}),
      },
      body: JSON.stringify({ phone, message }),
    });

    if (!res.ok) {
      console.error(
        `[foldify sms] provider rejected message for ${phone}: ${res.status} ${res.statusText}`,
      );
    }
  } catch (err) {
    // Never throw: an order stays confirmed even if its notification fails.
    console.error('[foldify sms] sending failed:', err);
  }
}

/**
 * Convenience wrapper used from the route layer so it always carries the
 * configured estimate and never awaits — the confirm response is sent
 * immediately and the SMS trails it.
 */
export function notifyOrderPlaced(order: Order): void {
  void sendOrderConfirmationSms({
    order,
    deliveryEstimateHours: config.deliveryEstimateHours,
  });
}