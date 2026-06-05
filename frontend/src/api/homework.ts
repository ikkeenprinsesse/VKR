import api from "./client";

export type AutoCheckType = "none" | "test" | "numerical" | "text";
export type AnswerStatus = "draft" | "submitted" | "graded" | "overdue";

export interface HWFile {
  url: string;
  original_name: string;
  content_type: string;
  size: number;
}

export interface Homework {
  id: number;
  lesson_id: number;
  description: string;
  files: HWFile[] | null;
  deadline: string;
  auto_check_type: AutoCheckType;
  correct_answer: string | null;
  max_score: number;
  status: string;
  created_at: string;
}

export interface HomeworkCreate {
  lesson_id: number;
  description: string;
  files?: HWFile[];
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
  files: HWFile[] | null;
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

export async function getMyAnswers(): Promise<Answer[]> {
  const res = await api.get<Answer[]>("/answers/my");
  return res.data;
}

export async function getAllAnswers(homeworkId: number): Promise<Answer[]> {
  const res = await api.get<Answer[]>(`/answers/${homeworkId}/all`);
  return res.data;
}

export async function submitAnswer(homeworkId: number, content: string, files?: HWFile[]): Promise<Answer> {
  const res = await api.post<Answer>("/answers/submit", {
    homework_id: homeworkId,
    content,
    files: files ?? [],
  });
  return res.data;
}

export async function gradeAnswer(answerId: number, data: AnswerGrade): Promise<Answer> {
  const res = await api.put<Answer>(`/answers/${answerId}/grade`, data);
  return res.data;
}

export async function uploadHomeworkFile(file: File): Promise<HWFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<any>("/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    url: res.data.url,
    original_name: res.data.original_name ?? file.name,
    content_type: file.type,
    size: file.size,
  };
}
