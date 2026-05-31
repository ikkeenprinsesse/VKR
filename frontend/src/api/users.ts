import api from "./client";
import type { UserOut } from "./auth";

export interface InvitationOut {
  token: string;
  invite_link: string;
  expires_at: string;
}

export async function getMyStudents(): Promise<UserOut[]> {
  const res = await api.get<UserOut[]>("/users/my-students");
  return res.data;
}

export async function createInvitation(expiresInHours = 168): Promise<InvitationOut> {
  const res = await api.post<InvitationOut>("/invitations/", { expires_in_hours: expiresInHours });
  return res.data;
}
