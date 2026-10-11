import type { Lesson, ScheduleData } from "../data/types";

const STORAGE_KEY = "ala-too-schedule-lessons-v1";

function isLesson(value: unknown, data: ScheduleData): value is Lesson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const lesson = value as Record<string, unknown>;

  return (
    typeof lesson.id === "string" &&
    lesson.id.trim() !== "" &&
    !data.sections.some((section) => section.id === lesson.id) &&
    data.sections.some((section) => section.id === lesson.sectionId) &&
    data.teachers.some((teacher) => teacher.id === lesson.teacherId) &&
    data.rooms.some((room) => room.id === lesson.roomId) &&
    data.meta.weekDays.some((day) => day.id === lesson.day) &&
    data.timeSlots.some((slot) => slot.id === lesson.timeSlotId)
  );
}

export function loadLessons(data: ScheduleData): Lesson[] {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return data.lessons;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      !Array.isArray(parsedValue) ||
      !parsedValue.every((value) => isLesson(value, data)) ||
      new Set(parsedValue.map((lesson) => lesson.id)).size !==
        parsedValue.length
    ) {
      return data.lessons;
    }

    return parsedValue;
  } catch {
    return data.lessons;
  }
}

export function saveLessons(lessons: Lesson[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  } catch {
    // The application can continue working without persistence.
  }
}

export function clearSavedLessons(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The application can continue working without persistence.
  }
}
