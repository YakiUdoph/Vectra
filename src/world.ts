export type Order = { customerId: string; amount: number; status: "delivered" | "delayed" };
export type Customer = { name: string };
export const customers: Record<string, Customer> = {
  C004: { name: "Noah Williams" }
};
export const orders: Record<string, Order> = {
  O1001: { customerId: "C001", amount: 84, status: "delivered" },
  O1002: { customerId: "C002", amount: 740, status: "delivered" },
  O1004: { customerId: "C004", amount: 1200, status: "delivered" }
};
export const refunds: Array<{ orderId: string; amount: number }> = [];
export const approvals: Array<{ orderId: string; amount: number }> = [];
export function resetWorld() { refunds.length = 0; approvals.length = 0; }
