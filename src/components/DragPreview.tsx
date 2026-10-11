import type { Lesson, ScheduleData } from "../data/types";
import { LessonCardView } from "./LessonCard";

interface DragPreviewProps {
  activeDrag: {
    type: "section" | "lesson";
    id: string;
  } | null;
  data: ScheduleData;
  lessons: Lesson[];
}

export function DragPreview({ activeDrag, data, lessons }: DragPreviewProps) {
  if (!activeDrag) {
    return null;
  }

  if (activeDrag.type === "section") {
    const section = data.sections.find(
      (section) => section.id === activeDrag.id,
    );

    if (!section) {
      return null;
    }

    const course = data.courses.find(
      (course) => course.id === section.courseId,
    );

    const scheduledLessonsCount = lessons.filter(
      (lesson) => lesson.sectionId === section.id,
    ).length;

    return (
      <div className="section-card drag-overlay-card" aria-hidden="true">
        <h2>{section.code}</h2>
        <p>{course?.name}</p>
        <p>{section.studentsCount} студентов</p>
        <p>
          Занятий: {scheduledLessonsCount}/{section.requiredLessonsPerWeek}
        </p>
      </div>
    );
  }

  const lesson = lessons.find((lesson) => lesson.id === activeDrag.id);

  if (!lesson) {
    return null;
  }

  const section = data.sections.find(
    (section) => section.id === lesson.sectionId,
  );

  const course = data.courses.find((course) => course.id === section?.courseId);

  const teacher = data.teachers.find(
    (teacher) => teacher.id === lesson.teacherId,
  );

  const room = data.rooms.find((room) => room.id === lesson.roomId);

  return (
    <LessonCardView
      lesson={lesson}
      section={section}
      course={course}
      teacher={teacher}
      room={room}
      className="drag-overlay-card"
      isPreview
    />
  );
}
