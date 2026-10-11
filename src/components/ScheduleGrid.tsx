import { Fragment, useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import ScheduleCell from "./ScheduleCell";
import LessonCard from "./LessonCard";
import type {
  Course,
  Lesson,
  Room,
  Section,
  Teacher,
  TimeSlot,
  WeekDay,
} from "../data/types";

interface WeekDayItem {
  id: WeekDay;
  label: string;
}

const shortDayLabels: Record<WeekDay, string> = {
  MON: "Пн",
  TUE: "Вт",
  WED: "Ср",
  THU: "Чт",
  FRI: "Пт",
};

function DayButton({
  day,
  isSelected,
  onSelect,
}: {
  day: WeekDayItem;
  isSelected: boolean;
  onSelect: (day: WeekDay) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.id}` });

  useEffect(() => {
    if (!isOver) return;

    // Allow touch/mouse dragging between days without squeezing the weekly grid.
    const timeout = window.setTimeout(() => onSelect(day.id), 400);
    return () => window.clearTimeout(timeout);
  }, [isOver, day.id, onSelect]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={isSelected}
      aria-label={day.label}
      className={isOver ? "schedule-day--over" : ""}
      onClick={() => onSelect(day.id)}
    >
      {shortDayLabels[day.id]}
    </button>
  );
}

interface ScheduleGridProps {
  courses: Course[];
  lessons: Lesson[];
  rooms: Room[];
  sections: Section[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  weekDays: WeekDayItem[];
  selectedDay?: WeekDay;
  selectedTimeSlotId?: string;
  slotAvailability: Record<string, boolean>;
  isDragging: boolean;
  teacherFilterId: string;
  roomFilterId: string;
  hasActiveFilters: boolean;
  onEditLesson: (lessonId: string) => void;
  onCopyLesson: (lessonId: string) => void;
  onTeacherFilterChange: (teacherId: string) => void;
  onRoomFilterChange: (roomId: string) => void;
  onResetFilters: () => void;
  onCellSelect?: (day: WeekDay, timeSlotId: string) => void;
}

function ScheduleGrid({
  weekDays,
  timeSlots,
  lessons,
  sections,
  courses,
  teachers,
  rooms,
  selectedDay,
  selectedTimeSlotId,
  slotAvailability,
  isDragging,
  teacherFilterId,
  roomFilterId,
  hasActiveFilters,
  onEditLesson,
  onCopyLesson,
  onTeacherFilterChange,
  onRoomFilterChange,
  onResetFilters,
  onCellSelect,
}: ScheduleGridProps) {
  const [mobileDay, setMobileDay] = useState<WeekDay>(weekDays[0].id);

  return (
    <section className="schedule">
      <div className="schedule-toolbar">
        <div className="schedule-title">
          <h2>Расписание</h2>

          {hasActiveFilters && (
            <span className="schedule-filter-result">
              Показано: {lessons.length}
            </span>
          )}
        </div>

        <div className="schedule-filters">
          <label className="schedule-filter">
            <span className="visually-hidden">Фильтр по преподавателю</span>

            <div className="schedule-filter-select">
              <select
                value={teacherFilterId}
                onChange={(event) => onTeacherFilterChange(event.target.value)}
                aria-label="Фильтр по преподавателю"
              >
                <option value="">Все преподаватели</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>

              <span className="select-arrow">⌄</span>
            </div>
          </label>

          <label className="schedule-filter">
            <span className="visually-hidden">Фильтр по аудитории</span>

            <div className="schedule-filter-select">
              <select
                value={roomFilterId}
                onChange={(event) => onRoomFilterChange(event.target.value)}
                aria-label="Фильтр по аудитории"
              >
                <option value="">Все аудитории</option>

                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>

              <span className="select-arrow">⌄</span>
            </div>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className="schedule-filter-reset"
              onClick={onResetFilters}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      <nav className="schedule-days" aria-label="День расписания">
        {weekDays.map((day) => (
          <DayButton
            key={day.id}
            day={day}
            isSelected={mobileDay === day.id}
            onSelect={setMobileDay}
          />
        ))}
      </nav>

      <div className="schedule-grid-scroll">
        <div className="schedule-grid">
          <div className="schedule-header">Время</div>

          {weekDays.map((day) => (
            <div
              className={`schedule-header ${day.id !== mobileDay ? "schedule-day--hidden" : ""}`}
              key={day.id}
            >
              {day.label}
            </div>
          ))}

          {timeSlots.map((timeSlot) => (
            <Fragment key={timeSlot.id}>
              <div className="schedule-time">
                {timeSlot.start}-{timeSlot.end}
              </div>

              {weekDays.map((day) => {
                const cellLessons = lessons.filter(
                  (lesson) =>
                    lesson.day === day.id && lesson.timeSlotId === timeSlot.id,
                );

                const cellId = `${day.id}-${timeSlot.id}`;
                const isValidDrop = slotAvailability[cellId];

                return (
                  <ScheduleCell
                    key={cellId}
                    id={cellId}
                    isHiddenOnMobile={day.id !== mobileDay}
                    lessonCount={cellLessons.length}
                    dropStatus={
                      isDragging
                        ? isValidDrop
                          ? "valid"
                          : "invalid"
                        : undefined
                    }
                    isSelected={
                      selectedDay === day.id &&
                      selectedTimeSlotId === timeSlot.id
                    }
                    onSelect={
                      onCellSelect
                        ? () => onCellSelect(day.id, timeSlot.id)
                        : undefined
                    }
                    isSelectionAllowed={isValidDrop}
                  >
                    {cellLessons.length === 0
                      ? "Пусто"
                      : cellLessons.map((lesson) => {
                          const section = sections.find(
                            (section) => section.id === lesson.sectionId,
                          );

                          const course = courses.find(
                            (course) => course.id === section?.courseId,
                          );

                          const teacher = teachers.find(
                            (teacher) => lesson.teacherId === teacher.id,
                          );

                          const room = rooms.find(
                            (room) => room.id === lesson.roomId,
                          );

                          return (
                            <LessonCard
                              key={lesson.id}
                              lesson={lesson}
                              section={section}
                              course={course}
                              teacher={teacher}
                              room={room}
                              onEdit={onEditLesson}
                              onCopy={onCopyLesson}
                            />
                          );
                        })}
                  </ScheduleCell>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ScheduleGrid;
