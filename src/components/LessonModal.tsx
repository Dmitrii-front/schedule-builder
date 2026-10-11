import { useEffect, useRef } from "react";
import type { Room, Teacher } from "../data/types";

type LessonModalMode = "create" | "edit";

interface LessonModalProps {
  mode: LessonModalMode;

  sectionCode: string;
  dayLabel: string;
  startTime: string;
  endTime: string;

  teachers: Teacher[];
  rooms: Room[];

  teacherId: string;
  roomId: string;

  isRoomAutoSelected?: boolean;
  validationErrors: string[];

  onTeacherChange: (teacherId: string) => void;
  onRoomChange: (roomId: string) => void;

  onSubmit: () => void;
  onCancel: () => void;

  onDelete?: () => void;
}

export function LessonModal({
  mode,
  sectionCode,
  dayLabel,
  startTime,
  endTime,
  teachers,
  rooms,
  teacherId,
  roomId,
  isRoomAutoSelected = false,
  validationErrors,
  onTeacherChange,
  onRoomChange,
  onSubmit,
  onCancel,
  onDelete,
}: LessonModalProps) {
  const isCreate = mode === "create";
  const canSubmit = teacherId !== "" && roomId !== "";
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    modal?.querySelector<HTMLSelectElement>("select")?.focus();

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !modal) return;

      const controls = modal.querySelectorAll<HTMLElement>(
        "button:not(:disabled), select:not(:disabled)",
      );
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        ref={modalRef}
        className="lesson-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lesson-modal-header">
          <div>
            <h2 id="lesson-modal-title">
              {isCreate ? "Новое занятие" : "Редактирование занятия"}
            </h2>

            <div className="lesson-modal-context">
              <strong>{sectionCode}</strong>
              <span>•</span>
              <span>{dayLabel}</span>
              <span>•</span>
              <span>
                {startTime}-{endTime}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onCancel}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="lesson-modal-fields">
          <label>
            Преподаватель
            <div className="select-wrapper">
              <select
                value={teacherId}
                onChange={(event) => onTeacherChange(event.target.value)}
              >
                <option value="">Выберите преподавателя</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>

              <span className="select-arrow">⌄</span>
            </div>
          </label>

          <div className="modal-field">
            <div className="modal-field-label">
              <label htmlFor="room-select">Аудитория</label>

              {isRoomAutoSelected && (
                <span className="auto-selection-badge">Автоподбор</span>
              )}
            </div>

            <div className="select-wrapper">
              <select
                id="room-select"
                value={roomId}
                onChange={(event) => onRoomChange(event.target.value)}
              >
                <option value="">Выберите аудиторию</option>

                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}, {room.capacity} мест
                  </option>
                ))}
              </select>

              <span className="select-arrow">⌄</span>
            </div>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors modal-errors" role="alert">
            {validationErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        <div className="lesson-modal-actions">
          <div className="lesson-modal-main-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              {isCreate ? "Добавить занятие" : "Сохранить"}
            </button>

            <button type="button" className="cancel-button" onClick={onCancel}>
              Отмена
            </button>
          </div>

          {!isCreate && onDelete && (
            <button type="button" className="delete-button" onClick={onDelete}>
              Удалить занятие
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
