import { useDroppable } from "@dnd-kit/core";

interface ScheduleCellProps {
  id: string;
  children: React.ReactNode;
  lessonCount?: number;
  isSelected?: boolean;
  dropStatus?: "valid" | "invalid";
  isSelectionAllowed?: boolean;
  onSelect?: () => void;
  isHiddenOnMobile?: boolean;
}

function ScheduleCell({
  id,
  children,
  lessonCount = 0,
  isSelected = false,
  isSelectionAllowed = false,
  dropStatus,
  onSelect,
  isHiddenOnMobile = false,
}: ScheduleCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={`schedule-cell
        ${isHiddenOnMobile ? "schedule-day--hidden" : ""}
        ${dropStatus === "valid" ? "schedule-cell--valid" : ""}
        ${dropStatus === "invalid" ? "schedule-cell--invalid" : ""}
        ${isOver ? "schedule-cell--over" : ""}
        ${isSelected ? "schedule-cell--selected" : ""}
        ${lessonCount > 1 ? "schedule-cell--multiple" : ""}
        ${onSelect && isSelectionAllowed ? "schedule-cell--selectable" : ""}
        ${onSelect && !isSelectionAllowed ? "schedule-cell--blocked" : ""}
      `}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {lessonCount > 1 && (
        <div className="schedule-cell-count">
          Занятий: <strong>{lessonCount}</strong>
        </div>
      )}
      <div className="schedule-cell-content">{children}</div>
    </div>
  );
}

export default ScheduleCell;
