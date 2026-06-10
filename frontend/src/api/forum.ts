import api from "./client";

export interface ForumThread {
  id: number;
  title: string;
  tag: string | null;
  tutor_id: number;
  author_name: string | null;
  post_count: number;
  created_at: string;
}

export interface ForumPost {
  id: number;
  thread_id: number;
  user_id: number;
  author_name: string | null;
  text: string;
  created_at: string;
  updated_at: string | null;
}

export async function getThreads(tag?: string): Promise<ForumThread[]> {
  const res = await api.get<ForumThread[]>("/forum/threads", {
    params: tag ? { tag } : undefined,
  });
  return res.data;
}

export async function createThread(title: string, tag?: string): Promise<ForumThread> {
  const res = await api.post<ForumThread>("/forum/threads", { title, tag: tag || null });
  return res.data;
}

export async function deleteThread(id: number): Promise<void> {
  await api.delete(`/forum/threads/${id}`);
}

export async function getPosts(threadId: number): Promise<ForumPost[]> {
  const res = await api.get<ForumPost[]>(`/forum/threads/${threadId}/posts`);
  return res.data;
}

export async function createPost(threadId: number, text: string): Promise<ForumPost> {
  const res = await api.post<ForumPost>(`/forum/threads/${threadId}/posts`, { text });
  return res.data;
}
