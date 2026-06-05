import api from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: "tutor" | "student";
  invite_code?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserOut {
  id: number;
  email: string;
  name: string;
  role: "tutor" | "student" | "admin";
  subjects?: string;
  level?: string;
  photo?: string | null;
  is_verified?: boolean;
  yoomoney_wallet?: string | null;
  default_lesson_price?: number | null;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.append("username", payload.username);
  form.append("password", payload.password);
  const res = await api.post<TokenResponse>("/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
  return res.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  const res = await api.post<UserOut>("/users/", payload);
  return res.data;
}

export async function getMe(): Promise<UserOut> {
  const res = await api.get<UserOut>("/users/me");
  return res.data;
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, new_password: newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post("/auth/verify-email", { token });
}

export async function sendVerification(): Promise<void> {
  await api.post("/auth/send-verification");
}
