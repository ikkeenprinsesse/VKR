import api from "./client";

export interface LoginPayload {
  username: string; // FastAPI OAuth2 uses "username"
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
  token_type: string;
}

export interface UserOut {
  id: number;
  email: string;
  name: string;
  role: "tutor" | "student" | "admin";
  subjects?: string;
  level?: string;
  rating?: number;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.append("username", payload.username);
  form.append("password", payload.password);
  const res = await api.post<TokenResponse>("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  const res = await api.post<UserOut>("/users/", payload);
  return res.data;
}

export async function getMe(): Promise<UserOut> {
  const res = await api.get<UserOut>("/users/me");
  return res.data;
}
