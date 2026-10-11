import { useDroppable } from "@dnd-kit/core";

function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "trash",
  });

  return (
    <div
      ref={setNodeRef}
      className={`trash-zone ${isOver ? "trash-zone--active" : ""}`}
    >
      <div className="trash-zone-content">
        <span className="trash-zone-icon">×</span>
        <strong>Удалить занятие</strong>
        <span>
          {isOver ? "Отпустите для удаления" : "Перетащите карточку сюда"}
        </span>
      </div>
    </div>
  );
}

export default TrashZone;
