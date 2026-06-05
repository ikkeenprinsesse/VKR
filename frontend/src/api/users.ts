import api from "./client";
import type { UserOut } from "./auth";

export interface ProfileUpdate {
  name?: string;
  subjects?: string;
  level?: string;
  photo?: string;
  yoomoney_wallet?: string;
  yoomoney_secret?: string;
  default_lesson_price?: number;
}

export async function updateProfile(data: ProfileUpdate): Promise<UserOut> {
  const res = await api.patch<UserOut>("/users/me/settings", data);
  return res.data;
}

export interface InvitationOut {
  token: string;
  invite_link: string;
  expires_at: string;
}

export async function getMyStudents(): Promise<UserOut[]> {
  const res = await api.get<UserOut[]>("/users/my-students");
  return res.data;
}

export async function getMyTutors(): Promise<UserOut[]> {
  const res = await api.get<UserOut[]>("/users/my-tutors");
  return res.data;
}

export async function createInvitation(expiresInHours = 168): Promise<InvitationOut> {
  const res = await api.post<InvitationOut>("/invitations/", { expires_in_hours: expiresInHours });
  return res.data;
}
