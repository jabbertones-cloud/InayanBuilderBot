/**
 * Admin order management. Exemplar: medusajs/medusa.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface Order {
  id: string;
  customerId: string;
  items: Array<{ productId: string; name: string; qty: number; price: number }>;
  total: number;
  status: OrderStatus;
  shippingAddress?: Record<string, string>;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStore {
  orders: Order[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "..", ".data");
const ordersFile = path.join(dataDir, "admin-orders.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ordersFile);
  } catch {
    await fs.writeFile(ordersFile, JSON.stringify({ orders: [] }, null, 2));
  }
}

async function readStore(): Promise<OrderStore> {
  await ensureStore();
  try {
    const raw = await fs.readFile(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    const orders = Array.isArray(parsed?.orders) ? parsed.orders : [];
    return { orders };
  } catch {
    return { orders: [] };
  }
}

async function writeStore(store: OrderStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(ordersFile, JSON.stringify({ orders: store.orders }, null, 2));
}

function cloneOrder(order: Order): Order {
  return {
    ...order,
    items: Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [],
    shippingAddress: order.shippingAddress ? { ...order.shippingAddress } : undefined,
  };
}

function applyFilters(orders: Order[], filters?: {
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
  offset?: number;
}): { orders: Order[]; total: number } {
  const filtered = orders.filter((order) => {
    if (filters?.status && order.status !== filters.status) return false;
    if (filters?.customerId && order.customerId !== filters.customerId) return false;
    return true;
  });
  const total = filtered.length;
  const offset = Math.max(0, Number(filters?.offset || 0));
  const limit = Math.max(1, Number(filters?.limit || 50));
  return {
    orders: filtered.slice(offset, offset + limit).map(cloneOrder),
    total,
  };
}

export async function createOrder(input: {
  customerId: string;
  items: Array<{ productId: string; name: string; qty: number; price: number }>;
  shippingAddress?: Record<string, string>;
}): Promise<Order> {
  const store = await readStore();
  const now = new Date().toISOString();
  const order: Order = {
    id: `ord_${Date.now()}`,
    customerId: input.customerId,
    items: input.items.map((item) => ({ ...item })),
    total: input.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    status: "pending",
    shippingAddress: input.shippingAddress ? { ...input.shippingAddress } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  store.orders.unshift(order);
  await writeStore(store);
  return cloneOrder(order);
}

export async function listOrders(filters?: {
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: Order[]; total: number }> {
  const store = await readStore();
  return applyFilters(store.orders, filters);
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const store = await readStore();
  const order = store.orders.find((entry) => entry.id === orderId);
  return order ? cloneOrder(order) : null;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const store = await readStore();
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error(`order_not_found:${orderId}`);
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await writeStore(store);
  console.log(`Order ${orderId} status -> ${status}`);
  return cloneOrder(order);
}

export async function fulfillOrder(orderId: string, trackingNumber: string): Promise<Order> {
  const store = await readStore();
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error(`order_not_found:${orderId}`);
  }
  order.trackingNumber = trackingNumber;
  order.status = "shipped";
  order.updatedAt = new Date().toISOString();
  await writeStore(store);
  console.log(`Fulfilling order ${orderId} with tracking ${trackingNumber}`);
  return cloneOrder(order);
}

export async function refundOrder(orderId: string, reason: string): Promise<Order> {
  const store = await readStore();
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error(`order_not_found:${orderId}`);
  }
  order.status = "refunded";
  order.updatedAt = new Date().toISOString();
  await writeStore(store);
  console.log(`Refunding order ${orderId}: ${reason}`);
  return cloneOrder(order);
}
