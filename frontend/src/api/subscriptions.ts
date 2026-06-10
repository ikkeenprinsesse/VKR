import api from "./client";

export type PlanType = "free" | "pro_monthly" | "pro_annual";

export interface Subscription {
  plan: PlanType;
  expires_at: string | null;
  is_active: boolean;
  days_left: number | null;
}

export interface CheckoutResponse {
  url: string;
  amount: number;
  plan: PlanType;
}

export async function getMySubscription(): Promise<Subscription> {
  const res = await api.get<Subscription>("/subscriptions/me");
  return res.data;
}

export async function getCheckoutUrl(plan: "pro_monthly" | "pro_annual"): Promise<CheckoutResponse> {
  const res = await api.get<CheckoutResponse>(`/subscriptions/checkout/${plan}`);
  return res.data;
}
