import { useDraggable } from "@dnd-kit/core";
import type { ComponentProps, Ref } from "react";
import type { Lesson, Section, Course, Teacher, Room } from "../data/types";

interface LessonCardProps {
  lesson: Lesson;
  section: Section | undefined;
  course: Course | undefined;
  teacher: Teacher | undefined;
  room: Room | undefined;
  onEdit: (lessonId: string) => void;
  onCopy: (lessonId: string) => void;
}

function LessonCard({
  lesson,
  section,
  course,
  teacher,
  room,
  onEdit,
  onCopy,
}: LessonCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: lesson.id,
      data: {
        type: "lesson",
        lessonId: lesson.id,
      },
    });

  return (
    <LessonCardView
      lesson={lesson}
      section={section}
      course={course}
      teacher={teacher}
      room={room}
      onEdit={onEdit}
      onCopy={onCopy}
      cardRef={setNodeRef}
      className={isDragging ? "lesson-card--dragging" : ""}
      dragHandleProps={{
        ...listeners,
        ...attributes,
        ref: setActivatorNodeRef,
      }}
    />
  );
}

interface LessonCardViewProps extends Omit<
  LessonCardProps,
  "onEdit" | "onCopy"
> {
  onEdit?: LessonCardProps["onEdit"];
  onCopy?: LessonCardProps["onCopy"];
  cardRef?: Ref<HTMLDivElement>;
  dragHandleProps?: ComponentProps<"button">;
  className?: string;
  isPreview?: boolean;
}

// The overlay uses the same markup and controls to preserve the source geometry.
export function LessonCardView({
  lesson,
  section,
  course,
  teacher,
  room,
  onEdit,
  onCopy,
  cardRef,
  dragHandleProps,
  className = "",
  isPreview = false,
}: LessonCardViewProps) {
  return (
    <div
      ref={cardRef}
      className={`lesson-card ${className}`}
      aria-hidden={isPreview || undefined}
    >
      <div className="lesson-card-content">
        <strong className="lesson-code">{section?.code}</strong>

        <span className="lesson-course">{course?.name}</span>

        <div className="lesson-meta">
          <span className="lesson-teacher">{teacher?.shortName}</span>
          <span className="lesson-room">{room?.name}</span>
        </div>
      </div>

      <div className="lesson-card-controls">
        <button
          type="button"
          className="lesson-icon-button drag-handle"
          {...dragHandleProps}
          tabIndex={isPreview ? -1 : dragHandleProps?.tabIndex}
          aria-label={`Перетащить занятие ${section?.code ?? ""}`}
          title="Перетащить"
        >
          <svg width="14" height="18" viewBox="0 0 16 20" aria-hidden="true">
            <circle cx="5" cy="5" r="1.5" fill="currentColor" />
            <circle cx="11" cy="5" r="1.5" fill="currentColor" />
            <circle cx="5" cy="10" r="1.5" fill="currentColor" />
            <circle cx="11" cy="10" r="1.5" fill="currentColor" />
            <circle cx="5" cy="15" r="1.5" fill="currentColor" />
            <circle cx="11" cy="15" r="1.5" fill="currentColor" />
          </svg>
        </button>

        <div className="lesson-secondary-actions">
          <button
            type="button"
            className="lesson-icon-button lesson-edit-button"
            aria-label="Изменить занятие"
            title="Изменить"
            tabIndex={isPreview ? -1 : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(lesson.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m14.5 7.5 3 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="lesson-icon-button lesson-copy-button"
            aria-label="Копировать занятие"
            title="Копировать"
            tabIndex={isPreview ? -1 : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onCopy?.(lesson.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="8"
                y="8"
                width="11"
                height="11"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonCard;
