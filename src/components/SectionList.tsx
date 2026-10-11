import { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import type { Course, Lesson, Section } from "../data/types";

interface SectionListProps {
  sections: Section[];
  courses: Course[];
  lessons: Lesson[];
}

function SectionList({ sections, courses, lessons }: SectionListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) {
      return sections;
    }

    return sections.filter((section) => {
      const course = courses.find((course) => course.id === section.courseId);

      return [section.code, course?.code, course?.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [sections, courses, normalizedQuery]);

  return (
    <aside className="section-list">
      <div className="section-list-header">
        <h2>Секции</h2>

        {normalizedQuery && (
          <span className="section-search-count">
            {filteredSections.length}/{sections.length}
          </span>
        )}
      </div>

      <div className="section-search">
        <svg
          className="section-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>

        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Найти секцию..."
          aria-label="Поиск секций"
        />

        {searchQuery && (
          <button
            type="button"
            className="section-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="Очистить поиск"
          >
            ×
          </button>
        )}
      </div>

      <div className="section-list-content">
        {filteredSections.length === 0 ? (
          <div className="section-search-empty">
            <p>Секции не найдены</p>
            <span>Попробуйте изменить запрос</span>
          </div>
        ) : (
          filteredSections.map((section) => {
            const course = courses.find(
              (course) => course.id === section.courseId,
            );

            const scheduledLessons = lessons.filter(
              (lesson) => lesson.sectionId === section.id,
            );

            return (
              <SectionCard
                key={section.id}
                section={section}
                course={course}
                scheduledLessonsCount={scheduledLessons.length}
                searchQuery={searchQuery}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}

export default SectionList;
