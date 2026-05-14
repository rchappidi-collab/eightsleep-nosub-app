import { describe, it, expect } from "vitest";
import { getTargetTemperatureFromSchedules } from "./scheduleLogic";

describe("getTargetTemperatureFromSchedules", () => {
  const baseDate = new Date("2024-01-01T00:00:00.000Z");

  function at(hour: number, minute: number): Date {
    const d = new Date(baseDate);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  describe("basic behavior", () => {
    it("returns null when no schedules exist", () => {
      const result = getTargetTemperatureFromSchedules([], at(12, 0));
      expect(result.targetLevel).toBeNull();
      expect(result.stage).toBe("no-schedule");
    });

    it("picks the schedule that matches the current time exactly", () => {
      const schedules = [{ time: "22:00", temperature: -5 }];
      const result = getTargetTemperatureFromSchedules(schedules, at(22, 0));
      expect(result.targetLevel).toBe(-5);
      expect(result.stage).toBe("schedule-22:00");
    });

    it("picks the most recent schedule before now", () => {
      const schedules = [
        { time: "22:00", temperature: -5 },
        { time: "23:30", temperature: 3 },
      ];
      const result = getTargetTemperatureFromSchedules(schedules, at(23, 45));
      expect(result.targetLevel).toBe(3);
      expect(result.stage).toBe("schedule-23:30");
    });

    it("picks the last schedule if now is after all of them", () => {
      const schedules = [
        { time: "20:00", temperature: 0 },
        { time: "22:00", temperature: -5 },
      ];
      const result = getTargetTemperatureFromSchedules(schedules, at(23, 0));
      expect(result.targetLevel).toBe(-5);
    });

    it("returns null before the first schedule entry", () => {
      const schedules = [{ time: "22:00", temperature: -5 }];
      const result = getTargetTemperatureFromSchedules(schedules, at(21, 0));
      expect(result.targetLevel).toBeNull();
      expect(result.stage).toBe("before-first-schedule");
    });
  });

  describe("edge cases", () => {
    it("handles midnight crossing correctly", () => {
      const schedules = [
        { time: "23:00", temperature: -5 },
        { time: "01:00", temperature: 3 },
      ];
      // At 00:30, the 23:00 schedule should still be active
      const result = getTargetTemperatureFromSchedules(schedules, at(0, 30));
      expect(result.targetLevel).toBe(-5);
      expect(result.stage).toBe("schedule-23:00");
    });

    it("handles single minute differences", () => {
      const schedules = [
        { time: "22:00", temperature: -5 },
        { time: "22:01", temperature: 5 },
      ];
      const result = getTargetTemperatureFromSchedules(schedules, at(22, 1));
      expect(result.targetLevel).toBe(5);
    });

    it("handles negative temperature values", () => {
      const schedules = [
        { time: "22:00", temperature: -10 },
        { time: "23:00", temperature: -5 },
      ];
      const result = getTargetTemperatureFromSchedules(schedules, at(23, 30));
      expect(result.targetLevel).toBe(-5);
    });

    it("handles zero temperature", () => {
      const schedules = [{ time: "22:00", temperature: 0 }];
      const result = getTargetTemperatureFromSchedules(schedules, at(22, 0));
      expect(result.targetLevel).toBe(0);
    });

    it("does not mutate the input array", () => {
      const schedules = [
        { time: "03:00", temperature: 5 },
        { time: "01:00", temperature: 0 },
      ];
      const originalOrder = [...schedules];
      getTargetTemperatureFromSchedules(schedules, at(2, 0));
      expect(schedules).toEqual(originalOrder);
    });

    it("handles duplicate times by picking the last one", () => {
      const schedules = [
        { time: "22:00", temperature: -5 },
        { time: "22:00", temperature: 5 },
      ];
      const result = getTargetTemperatureFromSchedules(schedules, at(22, 0));
      expect(result.targetLevel).toBe(5);
    });

    it("handles many schedule entries efficiently", () => {
      const schedules = Array.from({ length: 48 }, (_, i) => ({
        time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
        temperature: i - 24,
      }));
      const result = getTargetTemperatureFromSchedules(schedules, at(12, 15));
      expect(result.targetLevel).toBe(0); // 00:00 => -24, ..., 12:00 => 0
      expect(result.stage).toBe("schedule-12:00");
    });
  });

  describe("integration-like scenarios", () => {
    it("simulates a full night with gradual warming", () => {
      const schedules = [
        { time: "21:00", temperature: 5 },   // start warm
        { time: "22:00", temperature: 3 },   // cool down
        { time: "23:00", temperature: 0 },   // neutral
        { time: "00:00", temperature: -3 },  // cool
        { time: "01:00", temperature: -5 },  // coldest
        { time: "03:00", temperature: -3 },  // warming
        { time: "05:00", temperature: 0 },   // neutral
        { time: "06:00", temperature: 3 },   // warm up for wake
      ];

      expect(getTargetTemperatureFromSchedules(schedules, at(21, 30)).targetLevel).toBe(5);
      expect(getTargetTemperatureFromSchedules(schedules, at(22, 30)).targetLevel).toBe(3);
      expect(getTargetTemperatureFromSchedules(schedules, at(0, 30)).targetLevel).toBe(-3);
      expect(getTargetTemperatureFromSchedules(schedules, at(1, 30)).targetLevel).toBe(-5);
      expect(getTargetTemperatureFromSchedules(schedules, at(4, 0)).targetLevel).toBe(-3);
      expect(getTargetTemperatureFromSchedules(schedules, at(5, 30)).targetLevel).toBe(0);
      expect(getTargetTemperatureFromSchedules(schedules, at(6, 30)).targetLevel).toBe(3);
    });

    it("simulates a recovery mode with late-night cooling", () => {
      const schedules = [
        { time: "22:00", temperature: 5 },
        { time: "02:00", temperature: -10 },
        { time: "06:00", temperature: 5 },
      ];

      expect(getTargetTemperatureFromSchedules(schedules, at(23, 0)).targetLevel).toBe(5);
      // At 02:30, the 02:00 cooling kicks in
      expect(getTargetTemperatureFromSchedules(schedules, at(2, 30)).targetLevel).toBe(-10);
      // At 07:00, the 06:00 warming kicks in
      expect(getTargetTemperatureFromSchedules(schedules, at(7, 0)).targetLevel).toBe(5);
    });
  });
});
