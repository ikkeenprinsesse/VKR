import api from "./client";
import type { Lesson } from "./lessons";

export interface Slot {
  id: number;
  tutor_id: number;
  duration: number;
  is_recurring: boolean;
  slot_date: string | null;
  weekday: number | null;      // 0=Пн … 6=Вс
  slot_hour: number | null;
  slot_minute: number | null;
  reserved_for_student_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface SlotCreate {
  duration: number;
  is_recurring: boolean;
  slot_date?: string;
  weekday?: number;
  slot_hour?: number;
  slot_minute?: number;
  reserved_for_student_id?: number | null;
}

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const WEEKDAYS_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export function slotLabel(slot: Slot): string {
  if (slot.is_recurring) {
    const day = WEEKDAYS_FULL[slot.weekday!] ?? "";
    const time = `${String(slot.slot_hour).padStart(2, "0")}:${String(slot.slot_minute).padStart(2, "0")}`;
    return `${day}, ${time}`;
  }
  const d = new Date(slot.slot_date!);
  return d.toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export async function getMySlots(): Promise<Slot[]> {
  const res = await api.get<Slot[]>("/slots/my");
  return res.data;
}

export async function createSlot(data: SlotCreate): Promise<Slot> {
  const res = await api.post<Slot>("/slots/", data);
  return res.data;
}

export async function deleteSlot(id: number): Promise<void> {
  await api.delete(`/slots/${id}`);
}

export async function getAvailableSlots(): Promise<Slot[]> {
  const res = await api.get<Slot[]>("/slots/available");
  return res.data;
}

export async function bookSlot(slotId: number): Promise<Lesson> {
  const res = await api.post<Lesson>(`/slots/${slotId}/book`);
  return res.data;
}
