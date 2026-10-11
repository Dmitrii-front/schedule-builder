import { useDraggable } from "@dnd-kit/core";
import type { Section, Course } from "../data/types";
import HighlightText from "./HighlightText";

interface SectionCardProps {
  section: Section;
  course: Course | undefined;
  scheduledLessonsCount: number;
  searchQuery?: string;
}

function SectionCard({
  section,
  course,
  scheduledLessonsCount,
  searchQuery = "",
}: SectionCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: section.id,
    data: {
      type: "section",
      sectionId: section.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`section-card ${isDragging ? "section-card--dragging" : ""}`}
    >
      <h2>
        <HighlightText text={section.code} query={searchQuery} />
      </h2>

      <p>
        {course ? (
          <HighlightText text={course.name} query={searchQuery} />
        ) : (
          "Предмет не указан"
        )}
      </p>

      <p>{section.studentsCount} студентов</p>

      <p>
        Занятий: {scheduledLessonsCount}/{section.requiredLessonsPerWeek}
      </p>
    </div>
  );
}

export default SectionCard;
