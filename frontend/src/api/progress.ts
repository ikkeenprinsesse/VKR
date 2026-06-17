import api from "./client";

export interface StudentProgress {
  student_id: number;
  tutor_id: number;
  tutor_name: string;
  completion_rate: number;
  avg_score_normalized: number;
  attendance_rate: number;
  progress: number;
  total_homework: number;
  submitted_homework: number;
  graded_homework: number;
  total_lessons: number;
  attended_lessons: number;
}

export async function getMyProgress(studentId: number): Promise<StudentProgress[]> {
  const res = await api.get<StudentProgress[]>(`/progress/${studentId}`);
  return res.data;
}
