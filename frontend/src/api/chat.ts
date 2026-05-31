import api from "./client";

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  files: unknown[] | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MessageSend {
  receiver_id: number;
  text: string;
}

export async function getChatHistory(otherUserId: number): Promise<Message[]> {
  const res = await api.get<Message[]>(`/chat/history/${otherUserId}`);
  return res.data;
}

export async function sendMessage(data: MessageSend): Promise<Message> {
  const res = await api.post<Message>("/chat/send", data);
  return res.data;
}
