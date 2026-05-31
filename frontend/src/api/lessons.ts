import api from "./client";

export type LessonStatus = "planned" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Lesson {
  id: number;
  tutor_id: number;
  student_id: number;
  date: string;
  duration: number;
  status: LessonStatus;
  topic: string | null;
  meeting_link: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LessonCreate {
  student_id: number;
  date: string;
  duration: number;
  topic?: string;
  meeting_link?: string;
}

export interface LessonUpdate {
  date?: string;
  duration?: number;
  status?: LessonStatus;
  topic?: string;
  meeting_link?: string;
}

export async function getMySchedule(): Promise<Lesson[]> {
  const res = await api.get<Lesson[]>("/lessons/my-schedule");
  return res.data;
}

export async function createLesson(data: LessonCreate): Promise<Lesson> {
  const res = await api.post<Lesson>("/lessons/", data);
  return res.data;
}

export async function updateLesson(id: number, data: LessonUpdate): Promise<Lesson> {
  const res = await api.put<Lesson>(`/lessons/${id}`, data);
  return res.data;
}

export async function deleteLesson(id: number): Promise<void> {
  await api.delete(`/lessons/${id}`);
}
