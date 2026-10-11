import type { Lesson, Room, Section, WeekDay } from "../data/types";
import { hasEnoughCapacity, isRoomBusy } from "./validation";

export function findBestRoom(
  rooms: Room[],
  lessons: Lesson[],
  section: Section,
  day: WeekDay,
  timeSlotId: string,
): Room | undefined {
  const availableRooms = rooms.filter(
    (room) =>
      hasEnoughCapacity(section, room) &&
      !isRoomBusy(lessons, room.id, day, timeSlotId),
  );

  return availableRooms.sort((roomA, roomB) => {
    const roomAMatchesPreference = roomA.type === section.preferredRoomType;
    const roomBMatchesPreference = roomB.type === section.preferredRoomType;

    if (roomAMatchesPreference !== roomBMatchesPreference) {
      return roomAMatchesPreference ? -1 : 1;
    }

    const unusedSeatsA = roomA.capacity - section.studentsCount;
    const unusedSeatsB = roomB.capacity - section.studentsCount;

    return unusedSeatsA - unusedSeatsB;
  })[0];
}
