import api from "./client";

export interface ChatFile {
  url: string;
  original_name: string;
  content_type: string;
  size: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  files: ChatFile[] | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MessageSend {
  receiver_id: number;
  text: string;
  files?: ChatFile[];
}

export async function getChatHistory(otherUserId: number): Promise<Message[]> {
  const res = await api.get<Message[]>(`/chat/history/${otherUserId}`);
  return res.data;
}

export async function sendMessage(data: MessageSend): Promise<Message> {
  const res = await api.post<Message>("/chat/send", data);
  return res.data;
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const res = await api.get<Record<string, number>>("/chat/unread-counts");
  return res.data;
}

export async function uploadChatFile(file: File): Promise<ChatFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<ChatFile & { url: string }>("/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    url: res.data.url,
    original_name: (res.data as any).original_name ?? file.name,
    content_type: file.type,
    size: file.size,
  };
}
