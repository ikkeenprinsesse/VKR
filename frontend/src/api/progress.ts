import api from "./client";

export interface StudentProgress {
  student_id: number;
  completion_rate: number;       // доля выполненных ДЗ (0..1)
  avg_score_normalized: number;  // средняя оценка / max_score (0..1)
  attendance_rate: number;       // доля посещённых занятий (0..1)
  progress: number;              // итоговый балл 0..100
  total_homework: number;
  submitted_homework: number;
  graded_homework: number;
  total_lessons: number;
  attended_lessons: number;
}

export async function getMyProgress(studentId: number): Promise<StudentProgress> {
  const res = await api.get<StudentProgress>(`/progress/${studentId}`);
  return res.data;
}
