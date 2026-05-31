import api from "./client";

export interface PaymentLinkResponse {
  url: string;
  amount: number;
  label: string;
  wallet: string;
}

export interface UserSettings {
  yoomoney_wallet?: string;
  yoomoney_secret?: string;
  default_lesson_price?: number;
  name?: string;
  subjects?: string;
  level?: string;
}

export async function getPaymentLink(lessonId: number, amount: number): Promise<PaymentLinkResponse> {
  const res = await api.get<PaymentLinkResponse>(`/yoomoney/link/${lessonId}`, {
    params: { amount },
  });
  return res.data;
}

export async function updateSettings(data: UserSettings) {
  const res = await api.patch("/users/me/settings", data);
  return res.data;
}
