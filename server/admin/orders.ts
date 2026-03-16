/**
 * Admin order management. Exemplar: medusajs/medusa.
 */

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

export async function listOrders(filters?: {
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: Order[]; total: number }> {
  // TODO: Query database
  return { orders: [], total: 0 };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  // TODO: Query database
  return null;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  // TODO: Update in database, send notification
  console.log(`Order ${orderId} status -> ${status}`);
  return { id: orderId, customerId: "", items: [], total: 0, status, createdAt: "", updatedAt: new Date().toISOString() };
}

export async function fulfillOrder(orderId: string, trackingNumber: string): Promise<Order> {
  console.log(`Fulfilling order ${orderId} with tracking ${trackingNumber}`);
  return updateOrderStatus(orderId, "shipped");
}

export async function refundOrder(orderId: string, reason: string): Promise<Order> {
  // TODO: Trigger Stripe refund, update DB
  console.log(`Refunding order ${orderId}: ${reason}`);
  return updateOrderStatus(orderId, "refunded");
}
