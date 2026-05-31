import api from "./client";

export type AutoCheckType = "none" | "test" | "numerical" | "text";
export type AnswerStatus = "draft" | "submitted" | "graded" | "overdue";

export interface Homework {
  id: number;
  lesson_id: number;
  description: string;
  files: unknown[] | null;
  deadline: string;
  auto_check_type: AutoCheckType;
  correct_answer: string | null;
  max_score: number;
  created_at: string;
  status?: AnswerStatus;
}

export interface HomeworkCreate {
  lesson_id: number;
  description: string;
  deadline: string;
  auto_check_type?: AutoCheckType;
  correct_answer?: string;
  max_score?: number;
}

export interface Answer {
  id: number;
  homework_id: number;
  student_id: number;
  content: string | null;
  files: unknown[] | null;
  score: number | null;
  comment: string | null;
  status: AnswerStatus;
  submitted_at: string | null;
  graded_at: string | null;
}

export interface AnswerGrade {
  score: number;
  comment?: string;
}

export async function getAssignedHomework(): Promise<Homework[]> {
  const res = await api.get<Homework[]>("/homework/assigned");
  return res.data;
}

export async function createHomework(data: HomeworkCreate): Promise<Homework> {
  const res = await api.post<Homework>("/homework/", data);
  return res.data;
}

export async function deleteHomework(id: number): Promise<void> {
  await api.delete(`/homework/${id}`);
}

export async function getAllAnswers(homeworkId: number): Promise<Answer[]> {
  const res = await api.get<Answer[]>(`/answers/${homeworkId}/all`);
  return res.data;
}

export async function submitAnswer(homeworkId: number, content: string): Promise<Answer> {
  const res = await api.post<Answer>("/answers/submit", { homework_id: homeworkId, content });
  return res.data;
}

export async function gradeAnswer(answerId: number, data: AnswerGrade): Promise<Answer> {
  const res = await api.put<Answer>(`/answers/${answerId}/grade`, data);
  return res.data;
}
