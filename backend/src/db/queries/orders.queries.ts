import type { Order, OrderItem, OrderStatus } from '@foldify/shared';
import { db } from '../index.ts';

/** The raw shape SQLite hands back — snake_case. */
interface OrderRow {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_minor: number;
  currency: 'NPR';
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  payment_ref: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  unit_price_minor: number;
  quantity: number;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalMinor: row.total_minor,
    currency: row.currency,
    shippingName: row.shipping_name,
    shippingPhone: row.shipping_phone,
    shippingAddress: row.shipping_address,
    shippingCity: row.shipping_city,
    paymentRef: row.payment_ref,
    createdAt: row.created_at,
  };
}

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPriceMinor: row.unit_price_minor,
    quantity: row.quantity,
  };
}

const SELECT_ORDER = `
  SELECT id, user_id, status, total_minor, currency, shipping_name, shipping_phone,
         shipping_address, shipping_city, payment_ref, created_at
  FROM orders
`;

const SELECT_ITEMS = `
  SELECT id, order_id, product_id, product_name, unit_price_minor, quantity
  FROM order_items
  WHERE order_id = ?
  ORDER BY id
`;

/** The signed-in user's own orders, newest first. Summary rows — no items. */
export function listOrdersForUser(userId: number): Order[] {
  const rows = db
    .prepare(`${SELECT_ORDER} WHERE user_id = ? ORDER BY created_at DESC, id DESC`)
    .all(userId) as OrderRow[];
  return rows.map(mapOrder);
}

/** Single order with its line items. Returns null rather than throwing — HTTP concerns belong to routes/. */
export function getOrderById(id: number): Order | null {
  const row = db.prepare(`${SELECT_ORDER} WHERE id = ?`).get(id) as OrderRow | undefined;
  if (row === undefined) return null;

  const items = db.prepare(SELECT_ITEMS).all(id) as OrderItemRow[];
  return { ...mapOrder(row), items: items.map(mapOrderItem) };
}

export interface NewOrderItem {
  productId: number;
  /** Snapshot taken by the caller from the products table — the row may change later. */
  productName: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface NewOrder {
  userId: number;
  totalMinor: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  items: NewOrderItem[];
}

const INSERT_ORDER = `
  INSERT INTO orders
    (user_id, total_minor, shipping_name, shipping_phone, shipping_address, shipping_city)
  VALUES
    (@userId, @totalMinor, @shippingName, @shippingPhone, @shippingAddress, @shippingCity)
`;

const INSERT_ITEM = `
  INSERT INTO order_items
    (order_id, product_id, product_name, unit_price_minor, quantity)
  VALUES
    (@orderId, @productId, @productName, @unitPriceMinor, @quantity)
`;

/**
 * Inserts the order, its items and the stock decrements as one unit.
 *
 * better-sqlite3 transactions are synchronous — nothing awaited may appear
 * inside `run`, so the payment gateway is the caller's job once this returns.
 * The stock UPDATE is guarded by the `stock >= 0` CHECK, so a concurrent order
 * that empties the shelf between the caller's check and this write aborts the
 * whole transaction instead of overselling.
 */
export function insertOrder(input: NewOrder): Order {
  const run = db.transaction((order: NewOrder): number => {
    const result = db.prepare(INSERT_ORDER).run({
      userId: order.userId,
      totalMinor: order.totalMinor,
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
    });

    const orderId = Number(result.lastInsertRowid);
    const insertItem = db.prepare(INSERT_ITEM);
    const decrementStock = db.prepare('UPDATE products SET stock = stock - @quantity WHERE id = @productId');

    for (const item of order.items) {
      insertItem.run({ orderId, ...item });
      decrementStock.run({ quantity: item.quantity, productId: item.productId });
    }

    return orderId;
  });

  const created = getOrderById(run(input));
  if (created === null) throw new Error('Order insert succeeded but the row could not be read back.');
  return created;
}

/** Sets the status, and the payment reference too when one is supplied. */
export function setOrderStatus(id: number, status: OrderStatus, paymentRef?: string | null): void {
  if (paymentRef === undefined) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return;
  }
  db.prepare('UPDATE orders SET status = ?, payment_ref = ? WHERE id = ?').run(status, paymentRef, id);
}
