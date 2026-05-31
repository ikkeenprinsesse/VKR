import api from "./client";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface Payment {
  id: number;
  lesson_id: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface PaymentRecord {
  lesson_id: number;
  amount: number;
  currency?: string;
  payment_method?: string;
  payment_date?: string;
}

export interface PaymentAnalyticsItem {
  period: string;   // "YYYY-MM"
  total: number;
  count: number;
}

export async function getMyIncome(): Promise<Payment[]> {
  const res = await api.get<Payment[]>("/payments/my-income");
  return res.data;
}

export async function recordPayment(data: PaymentRecord): Promise<Payment> {
  const res = await api.post<Payment>("/payments/record", data);
  return res.data;
}

export async function getPaymentAnalytics(): Promise<PaymentAnalyticsItem[]> {
  const res = await api.get<PaymentAnalyticsItem[]>("/payments/analytics");
  return res.data;
}
