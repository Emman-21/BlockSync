import { describe, expect, it } from "vitest";
import {
  getClassroomDueDate,
  toClassroomDeadline,
} from "../src/utils/classroomDeadlines";

describe("Google Classroom deadline times", () => {
  it("interprets synced explicit due times as UTC before displaying locally", () => {
    const deadline = toClassroomDeadline({
      id: "coursework-1",
      contentType: "coursework",
      dueYear: 2026,
      dueMonth: 10,
      dueDay: 12,
      dueHour: 15,
      dueMinute: 59,
    });

    expect(deadline.dueDate).toBe("2026-10-12T15:59:00.000Z");
    expect(
      new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(deadline.dueDate))
    ).toBe("11:59 PM");
  });

  it("keeps the end-of-day default as local time when no due time was synced", () => {
    const dueDate = getClassroomDueDate({
      dueYear: 2026,
      dueMonth: 10,
      dueDay: 12,
    });

    expect(dueDate.getHours()).toBe(23);
    expect(dueDate.getMinutes()).toBe(59);
  });
});
