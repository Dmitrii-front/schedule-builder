import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import rawData from "./data/schedule-mock-data.json";
import SectionList from "./components/SectionList";
import ScheduleGrid from "./components/ScheduleGrid";
import TrashZone from "./components/TrashZone";
import { LessonModal } from "./components/LessonModal";
import { DragPreview } from "./components/DragPreview";
import type { LessonDraft, ScheduleData, WeekDay } from "./data/types";
import { validateLesson, validateSectionDrop } from "./domain/validation";
import {
  clearSavedLessons,
  loadLessons,
  saveLessons,
} from "./utils/scheduleStorage";
import { findBestRoom } from "./domain/roomSelection";
import "./App.css";

const data = rawData as ScheduleData;

type ActiveDrag = {
  type: "section" | "lesson";
  id: string;
};
type SlotAvailability = Record<string, boolean>;

function isWeekDay(value: string): value is WeekDay {
  return ["MON", "TUE", "WED", "THU", "FRI"].includes(value);
}

const dayLabels: Record<WeekDay, string> = {
  MON: "Понедельник",
  TUE: "Вторник",
  WED: "Среда",
  THU: "Четверг",
  FRI: "Пятница",
};

const detectScheduleCollision: CollisionDetection = (args) => {
  // Small day tabs must respond to the pointer rather than the entire preview.
  const dayCollisions = pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) =>
      container.id.toString().startsWith("day-"),
    ),
  });

  return dayCollisions.length > 0 ? dayCollisions : rectIntersection(args);
};

function App() {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );
  const [lessons, setLessons] = useState(() => loadLessons(data));
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isRoomAutoSelected, setIsRoomAutoSelected] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [copyingLessonId, setCopyingLessonId] = useState<string | null>(null);
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editRoomId, setEditRoomId] = useState("");
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability>(
    {},
  );
  const [teacherFilterId, setTeacherFilterId] = useState("");
  const [roomFilterId, setRoomFilterId] = useState("");

  useEffect(() => {
    saveLessons(lessons);
  }, [lessons]);

  useEffect(() => {
    if (!dragError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDragError(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dragError]);

  useEffect(() => {
    if (!copyingLessonId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cancelCopyLesson();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [copyingLessonId]);

  const visibleLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesTeacher =
        !teacherFilterId || lesson.teacherId === teacherFilterId;

      const matchesRoom = !roomFilterId || lesson.roomId === roomFilterId;

      return matchesTeacher && matchesRoom;
    });
  }, [lessons, teacherFilterId, roomFilterId]);

  const hasActiveFilters = Boolean(teacherFilterId || roomFilterId);

  const draftSection = lessonDraft
    ? data.sections.find((section) => section.id === lessonDraft.sectionId)
    : undefined;

  const draftTimeSlot = lessonDraft
    ? data.timeSlots.find((slot) => slot.id === lessonDraft.timeSlotId)
    : undefined;

  const editingLesson = editingLessonId
    ? lessons.find((lesson) => lesson.id === editingLessonId)
    : undefined;

  const editingSection = editingLesson
    ? data.sections.find((section) => section.id === editingLesson.sectionId)
    : undefined;

  const editingTimeSlot = editingLesson
    ? data.timeSlots.find((slot) => slot.id === editingLesson.timeSlotId)
    : undefined;

  const copyingLesson = copyingLessonId
    ? (lessons.find((lesson) => lesson.id === copyingLessonId) ?? null)
    : null;

  const copyingSection = copyingLesson
    ? (data.sections.find(
        (section) => section.id === copyingLesson.sectionId,
      ) ?? null)
    : null;

  const copySlotAvailability = useMemo<SlotAvailability>(() => {
    if (!copyingLesson || !copyingSection) {
      return {};
    }

    const sourceRoom = data.rooms.find(
      (room) => room.id === copyingLesson.roomId,
    );

    if (!sourceRoom) {
      return {};
    }

    const availability: SlotAvailability = {};

    for (const day of data.meta.weekDays) {
      for (const timeSlot of data.timeSlots) {
        const cellId = `${day.id}-${timeSlot.id}`;

        const sourceRoomValidation = validateLesson(
          lessons,
          copyingSection,
          sourceRoom,
          copyingLesson.teacherId,
          day.id,
          timeSlot.id,
          data.teacherBlockedSlots,
        );

        if (sourceRoomValidation.isValid) {
          availability[cellId] = true;
          continue;
        }

        const bestRoom = findBestRoom(
          data.rooms,
          lessons,
          copyingSection,
          day.id,
          timeSlot.id,
        );

        if (!bestRoom) {
          availability[cellId] = false;
          continue;
        }

        availability[cellId] = validateLesson(
          lessons,
          copyingSection,
          bestRoom,
          copyingLesson.teacherId,
          day.id,
          timeSlot.id,
          data.teacherBlockedSlots,
        ).isValid;
      }
    }

    return availability;
  }, [copyingLesson, copyingSection, lessons]);

  function closeCreateModal() {
    setLessonDraft(null);
    setSelectedTeacherId("");
    setSelectedRoomId("");
    setIsRoomAutoSelected(false);
    setValidationErrors([]);
  }

  function closeEditModal() {
    setEditingLessonId(null);
    setEditTeacherId("");
    setEditRoomId("");
    setIsRoomAutoSelected(false);
    setValidationErrors([]);
  }

  function startCopyLesson(lessonId: string) {
    closeCreateModal();
    closeEditModal();
    setDragError(null);
    setCopyingLessonId(lessonId);
  }

  function cancelCopyLesson() {
    setCopyingLessonId(null);
  }

  function selectCopyTarget(day: WeekDay, timeSlotId: string) {
    if (!copyingLesson || !copyingSection) {
      return;
    }

    const cellId = `${day}-${timeSlotId}`;

    if (!copySlotAvailability[cellId]) {
      const sourceRoom = data.rooms.find(
        (room) => room.id === copyingLesson.roomId,
      );

      let errors: string[] = [];

      if (sourceRoom) {
        errors = validateLesson(
          lessons,
          copyingSection,
          sourceRoom,
          copyingLesson.teacherId,
          day,
          timeSlotId,
          data.teacherBlockedSlots,
        ).errors;
      }

      const bestRoom = findBestRoom(
        data.rooms,
        lessons,
        copyingSection,
        day,
        timeSlotId,
      );

      if (bestRoom) {
        errors = validateLesson(
          lessons,
          copyingSection,
          bestRoom,
          copyingLesson.teacherId,
          day,
          timeSlotId,
          data.teacherBlockedSlots,
        ).errors;
      }

      setDragError(errors[0] ?? "Нет подходящей аудитории для этого времени");

      return;
    }

    const sourceRoom = data.rooms.find(
      (room) => room.id === copyingLesson.roomId,
    );

    let roomId = copyingLesson.roomId;
    let wasAutoSelected = false;

    if (sourceRoom) {
      const sourceRoomValidation = validateLesson(
        lessons,
        copyingSection,
        sourceRoom,
        copyingLesson.teacherId,
        day,
        timeSlotId,
        data.teacherBlockedSlots,
      );

      if (!sourceRoomValidation.isValid) {
        const bestRoom = findBestRoom(
          data.rooms,
          lessons,
          copyingSection,
          day,
          timeSlotId,
        );

        if (!bestRoom) {
          return;
        }

        roomId = bestRoom.id;
        wasAutoSelected = true;
      }
    }

    setSelectedTeacherId(copyingLesson.teacherId);
    setSelectedRoomId(roomId);
    setIsRoomAutoSelected(wasAutoSelected);
    setValidationErrors([]);

    setLessonDraft({
      sectionId: copyingLesson.sectionId,
      day,
      timeSlotId,
    });

    setCopyingLessonId(null);
  }

  function handleEditLesson(lessonId: string) {
    const lesson = lessons.find((lesson) => lesson.id === lessonId);

    if (!lesson) {
      return;
    }

    closeCreateModal();
    cancelCopyLesson();

    setEditingLessonId(lessonId);
    setEditTeacherId(lesson.teacherId);
    setEditRoomId(lesson.roomId);
    setIsRoomAutoSelected(false);
    setValidationErrors([]);
  }

  function saveEditedLesson() {
    if (!editingLessonId) {
      return;
    }

    const lesson = lessons.find((lesson) => lesson.id === editingLessonId);

    if (!lesson) {
      return;
    }

    const section = data.sections.find(
      (section) => section.id === lesson.sectionId,
    );

    const room = data.rooms.find((room) => room.id === editRoomId);

    if (!section || !room || !editTeacherId) {
      return;
    }

    const otherLessons = lessons.filter(
      (lesson) => lesson.id !== editingLessonId,
    );

    const validation = validateLesson(
      otherLessons,
      section,
      room,
      editTeacherId,
      lesson.day,
      lesson.timeSlotId,
      data.teacherBlockedSlots,
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLessons((currentLessons) =>
      currentLessons.map((currentLesson) =>
        currentLesson.id === editingLessonId
          ? {
              ...currentLesson,
              teacherId: editTeacherId,
              roomId: editRoomId,
            }
          : currentLesson,
      ),
    );

    closeEditModal();
  }

  function deleteLesson(lessonId: string) {
    if (copyingLessonId === lessonId) cancelCopyLesson();
    setLessons((currentLessons) =>
      currentLessons.filter((lesson) => lesson.id !== lessonId),
    );

    if (editingLessonId === lessonId) {
      closeEditModal();
      return;
    }

    setValidationErrors([]);
  }

  function moveLesson(
    lessonId: string,
    newDay: WeekDay,
    newTimeSlotId: string,
  ) {
    const lesson = lessons.find((lesson) => lesson.id === lessonId);

    if (!lesson) {
      return;
    }

    const section = data.sections.find(
      (section) => section.id === lesson.sectionId,
    );

    const room = data.rooms.find((room) => room.id === lesson.roomId);

    if (!section || !room) {
      return;
    }

    const otherLessons = lessons.filter((lesson) => lesson.id !== lessonId);

    setDragError(null);

    const validation = validateLesson(
      otherLessons,
      section,
      room,
      lesson.teacherId,
      newDay,
      newTimeSlotId,
      data.teacherBlockedSlots,
    );

    if (!validation.isValid) {
      setDragError(validation.errors.join(" • "));
      return;
    }

    setDragError(null);

    setValidationErrors([]);

    setLessons((currentLessons) =>
      currentLessons.map((currentLesson) =>
        currentLesson.id === lessonId
          ? {
              ...currentLesson,
              day: newDay,
              timeSlotId: newTimeSlotId,
            }
          : currentLesson,
      ),
    );
  }

  function addLesson() {
    if (!lessonDraft) {
      return;
    }

    const section = data.sections.find(
      (section) => section.id === lessonDraft.sectionId,
    );

    const room = data.rooms.find((room) => room.id === selectedRoomId);

    if (!section || !room || !selectedTeacherId) {
      return;
    }

    const validation = validateLesson(
      lessons,
      section,
      room,
      selectedTeacherId,
      lessonDraft.day,
      lessonDraft.timeSlotId,
      data.teacherBlockedSlots,
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    const newLesson = {
      id: crypto.randomUUID(),
      sectionId: lessonDraft.sectionId,
      teacherId: selectedTeacherId,
      roomId: selectedRoomId,
      day: lessonDraft.day,
      timeSlotId: lessonDraft.timeSlotId,
    };

    setLessons((currentLessons) => [...currentLessons, newLesson]);
    closeCreateModal();
  }

  function getSlotAvailability(activeDrag: ActiveDrag): SlotAvailability {
    const availability: SlotAvailability = {};

    if (activeDrag.type === "section") {
      const section = data.sections.find(
        (section) => section.id === activeDrag.id,
      );
      if (!section) return availability;

      for (const day of data.meta.weekDays) {
        for (const timeSlot of data.timeSlots) {
          const cellId = `${day.id}-${timeSlot.id}`;

          const room = findBestRoom(
            data.rooms,
            lessons,
            section,
            day.id,
            timeSlot.id,
          );
          availability[cellId] = validateSectionDrop(
            lessons,
            section,
            room,
            data.teachers,
            day.id,
            timeSlot.id,
            data.teacherBlockedSlots,
          ).isValid;
        }
      }

      return availability;
    }

    const lesson = lessons.find((lesson) => lesson.id === activeDrag.id);

    if (!lesson) {
      return availability;
    }

    const section = data.sections.find(
      (section) => section.id === lesson.sectionId,
    );

    const room = data.rooms.find((room) => room.id === lesson.roomId);

    if (!section || !room) {
      return availability;
    }

    const otherLessons = lessons.filter(
      (currentLesson) => currentLesson.id !== lesson.id,
    );

    for (const day of data.meta.weekDays) {
      for (const timeSlot of data.timeSlots) {
        const cellId = `${day.id}-${timeSlot.id}`;

        const validation = validateLesson(
          otherLessons,
          section,
          room,
          lesson.teacherId,
          day.id,
          timeSlot.id,
          data.teacherBlockedSlots,
        );

        availability[cellId] = validation.isValid;
      }
    }

    return availability;
  }

  function handleDragStart(event: DragStartEvent) {
    cancelCopyLesson();
    setDragError(null);
    const type = event.active.data.current?.type;

    if (type === "section") {
      const sectionId = event.active.data.current?.sectionId;

      if (!sectionId) {
        return;
      }

      const drag: ActiveDrag = {
        type: "section",
        id: sectionId,
      };

      setActiveDrag(drag);
      setSlotAvailability(getSlotAvailability(drag));
      return;
    }

    if (type === "lesson") {
      const lessonId = event.active.data.current?.lessonId;

      if (!lessonId) {
        return;
      }

      const drag: ActiveDrag = {
        type: "lesson",
        id: lessonId,
      };

      setActiveDrag(drag);
      setSlotAvailability(getSlotAvailability(drag));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    setSlotAvailability({});

    if (!event.over) {
      return;
    }

    const dragType = event.active.data.current?.type;

    if (event.over.id === "trash" && dragType === "lesson") {
      const lessonId = event.active.data.current?.lessonId;

      if (!lessonId) {
        return;
      }

      deleteLesson(lessonId);
      return;
    }

    const [newDay, newTimeSlotId] = event.over.id.toString().split("-");

    if (!newDay || !newTimeSlotId || !isWeekDay(newDay)) {
      return;
    }

    if (dragType === "section") {
      const sectionId = event.active.data.current?.sectionId;

      if (!sectionId) {
        return;
      }

      const section = data.sections.find(
        (currentSection) => currentSection.id === sectionId,
      );

      if (!section) {
        return;
      }

      const bestRoom = findBestRoom(
        data.rooms,
        lessons,
        section,
        newDay,
        newTimeSlotId,
      );

      const validation = validateSectionDrop(
        lessons,
        section,
        bestRoom,
        data.teachers,
        newDay,
        newTimeSlotId,
        data.teacherBlockedSlots,
      );

      if (!validation.isValid) {
        setDragError(validation.errors.join(" • "));
        return;
      }

      closeEditModal();

      setSelectedTeacherId(section.teacherId ?? "");
      setSelectedRoomId(bestRoom?.id ?? "");
      setIsRoomAutoSelected(Boolean(bestRoom));
      setValidationErrors([]);
      setLessonDraft({
        sectionId,
        day: newDay,
        timeSlotId: newTimeSlotId,
      });

      return;
    }

    if (dragType === "lesson") {
      const lessonId = event.active.data.current?.lessonId;

      if (!lessonId) {
        return;
      }

      moveLesson(lessonId, newDay, newTimeSlotId);
    }
  }

  function resetSchedule() {
    const shouldReset = window.confirm(
      "Сбросить расписание? Все внесённые изменения будут удалены.",
    );

    if (!shouldReset) {
      return;
    }

    clearSavedLessons();
    setLessons(data.lessons);
    setTeacherFilterId("");
    setRoomFilterId("");
    setDragError(null);
    cancelCopyLesson();
    setActiveDrag(null);
    setSlotAvailability({});
    closeCreateModal();
    closeEditModal();
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">ALA-TOO UNIVERSITY</p>
          <h1>Конструктор расписания</h1>
          <p className="app-subtitle">
            Управление учебными секциями, аудиториями и преподавателями
          </p>
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            className="schedule-reset-button"
            onClick={resetSchedule}
          >
            Сбросить расписание
          </button>

          <div className="app-stats">
            <div className="stat">
              <span>Секции:</span>
              <strong>{data.sections.length}</strong>
            </div>

            <div className="stat">
              <span>Занятий:</span>
              <strong>{lessons.length}</strong>
            </div>
          </div>
        </div>
      </header>

      {editingLessonId &&
        editingLesson &&
        editingSection &&
        editingTimeSlot && (
          <LessonModal
            mode="edit"
            sectionCode={editingSection.code}
            dayLabel={dayLabels[editingLesson.day]}
            startTime={editingTimeSlot.start}
            endTime={editingTimeSlot.end}
            teachers={data.teachers}
            rooms={data.rooms}
            teacherId={editTeacherId}
            roomId={editRoomId}
            validationErrors={validationErrors}
            onTeacherChange={(teacherId) => {
              setEditTeacherId(teacherId);
              setValidationErrors([]);
            }}
            onRoomChange={(roomId) => {
              setEditRoomId(roomId);
              setValidationErrors([]);
            }}
            onSubmit={saveEditedLesson}
            onCancel={closeEditModal}
            onDelete={() => deleteLesson(editingLessonId)}
          />
        )}

      {lessonDraft && draftSection && draftTimeSlot && (
        <LessonModal
          mode="create"
          sectionCode={draftSection.code}
          dayLabel={dayLabels[lessonDraft.day]}
          startTime={draftTimeSlot.start}
          endTime={draftTimeSlot.end}
          teachers={data.teachers}
          rooms={data.rooms}
          teacherId={selectedTeacherId}
          roomId={selectedRoomId}
          validationErrors={validationErrors}
          isRoomAutoSelected={isRoomAutoSelected}
          onTeacherChange={(teacherId) => {
            setSelectedTeacherId(teacherId);
            setValidationErrors([]);
          }}
          onRoomChange={(roomId) => {
            setSelectedRoomId(roomId);
            setValidationErrors([]);
            setIsRoomAutoSelected(false);
          }}
          onSubmit={addLesson}
          onCancel={closeCreateModal}
        />
      )}

      {dragError && (
        <div className="drag-error-toast" role="alert">
          <div className="drag-error-content">
            <strong>Действие невозможно</strong>
            <span>{dragError}</span>
          </div>

          <button
            type="button"
            onClick={() => setDragError(null)}
            aria-label="Закрыть уведомление"
          >
            ×
          </button>

          <div className="drag-error-progress" aria-hidden="true" />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={detectScheduleCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDrag(null);
          setSlotAvailability({});
        }}
      >
        <div className="app-layout">
          <div className="section-panel">
            <SectionList
              sections={data.sections}
              courses={data.courses}
              lessons={lessons}
            />

            {activeDrag?.type === "lesson" && <TrashZone />}
          </div>

          <div
            className={`schedule-area ${copyingLessonId ? "schedule-area--copying" : ""}`}
          >
            {copyingLesson && copyingSection && (
              <div className="copy-mode-banner">
                <div>
                  <strong>Выберите ячейку для копии</strong>
                  <span>
                    Занятие {copyingSection.code}. Допустимые ячейки будут
                    подсвечены.
                  </span>
                </div>

                <button type="button" onClick={cancelCopyLesson}>
                  Отмена
                </button>
              </div>
            )}

            <ScheduleGrid
              weekDays={data.meta.weekDays}
              timeSlots={data.timeSlots}
              lessons={visibleLessons}
              sections={data.sections}
              courses={data.courses}
              teachers={data.teachers}
              rooms={data.rooms}
              selectedDay={lessonDraft?.day}
              selectedTimeSlotId={lessonDraft?.timeSlotId}
              onEditLesson={handleEditLesson}
              onCopyLesson={startCopyLesson}
              slotAvailability={
                copyingLessonId ? copySlotAvailability : slotAvailability
              }
              onCellSelect={copyingLessonId ? selectCopyTarget : undefined}
              isDragging={activeDrag !== null || copyingLessonId !== null}
              teacherFilterId={teacherFilterId}
              roomFilterId={roomFilterId}
              hasActiveFilters={hasActiveFilters}
              onTeacherFilterChange={setTeacherFilterId}
              onRoomFilterChange={setRoomFilterId}
              onResetFilters={() => {
                setTeacherFilterId("");
                setRoomFilterId("");
              }}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          <DragPreview activeDrag={activeDrag} data={data} lessons={lessons} />
        </DragOverlay>
      </DndContext>
    </main>
  );
}

export default App;
