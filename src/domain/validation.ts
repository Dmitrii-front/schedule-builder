import type {
  Room,
  Section,
  Lesson,
  WeekDay,
  TeacherBlockedSlot,
  Teacher,
} from "../data/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function hasEnoughCapacity(section: Section, room: Room): boolean {
  return room.capacity >= section.studentsCount;
}

export function isRoomBusy(
  lessons: Lesson[],
  roomId: string,
  day: WeekDay,
  timeSlotId: string,
): boolean {
  return lessons.some(
    (lesson) =>
      lesson.roomId === roomId &&
      lesson.day === day &&
      lesson.timeSlotId === timeSlotId,
  );
}

export function isTeacherBusy(
  lessons: Lesson[],
  teacherId: string,
  day: WeekDay,
  timeSlotId: string,
): boolean {
  return lessons.some(
    (lesson) =>
      lesson.teacherId === teacherId &&
      lesson.day === day &&
      lesson.timeSlotId === timeSlotId,
  );
}

export function isTeacherUnavailable(
  blockedSlots: TeacherBlockedSlot[],
  teacherId: string,
  day: WeekDay,
  timeSlotId: string,
): boolean {
  return blockedSlots.some(
    (blockedSlot) =>
      blockedSlot.teacherId === teacherId &&
      blockedSlot.day === day &&
      blockedSlot.timeSlotId === timeSlotId,
  );
}

export function isSectionBusy(
  lessons: Lesson[],
  sectionId: string,
  day: WeekDay,
  timeSlotId: string,
): boolean {
  return lessons.some(
    (lesson) =>
      lesson.sectionId === sectionId &&
      lesson.day === day &&
      lesson.timeSlotId === timeSlotId,
  );
}

export function validateLesson(
  lessons: Lesson[],
  section: Section,
  room: Room,
  teacherId: string,
  day: WeekDay,
  timeSlotId: string,
  blockedSlots: TeacherBlockedSlot[],
): ValidationResult {
  const errors: string[] = [];

  if (!hasEnoughCapacity(section, room)) {
    errors.push(
      `Недостаточно мест: в секции ${section.studentsCount} студентов, в аудитории ${room.capacity} мест`,
    );
  }

  if (isRoomBusy(lessons, room.id, day, timeSlotId)) {
    errors.push("Аудитория уже занята в это время");
  }

  if (isTeacherBusy(lessons, teacherId, day, timeSlotId)) {
    errors.push("Преподаватель уже ведёт другое занятие в это время");
  }

  if (isTeacherUnavailable(blockedSlots, teacherId, day, timeSlotId)) {
    errors.push("Преподаватель недоступен в это время");
  }

  if (isSectionBusy(lessons, section.id, day, timeSlotId)) {
    errors.push("Секция уже занята в это время");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// A section has no room yet, and may still need a teacher chosen in the editor.
export function validateSectionDrop(
  lessons: Lesson[],
  section: Section,
  room: Room | undefined,
  teachers: Teacher[],
  day: WeekDay,
  timeSlotId: string,
  blockedSlots: TeacherBlockedSlot[],
): ValidationResult {
  if (isSectionBusy(lessons, section.id, day, timeSlotId)) {
    return { isValid: false, errors: ["Секция уже занята в это время"] };
  }

  if (!room) {
    return {
      isValid: false,
      errors: ["Нет подходящей свободной аудитории для этого времени"],
    };
  }

  const teacherIds = section.teacherId
    ? [section.teacherId]
    : teachers.map((teacher) => teacher.id);
  let errors = ["Нет доступного преподавателя для этого времени"];

  for (const teacherId of teacherIds) {
    const validation = validateLesson(
      lessons,
      section,
      room,
      teacherId,
      day,
      timeSlotId,
      blockedSlots,
    );

    if (validation.isValid) return validation;
    errors = validation.errors;
  }

  return { isValid: false, errors };
}
