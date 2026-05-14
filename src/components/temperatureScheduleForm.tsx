"use client";
import React, { useState } from "react";
import { apiR } from "~/trpc/react";
import { Button } from "./ui/button";

type ScheduleEntry = {
  id: number;
  time: string;
  temperature: number;
};

export const TemperatureScheduleForm: React.FC = () => {
  const [time, setTime] = useState("22:00");
  const [temperature, setTemperature] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = apiR.useUtils();

  const scheduleQuery = apiR.user.getTemperatureSchedule.useQuery();

  const addMutation = apiR.user.addTemperatureSchedule.useMutation({
    onSuccess: () => {
      void utils.user.getTemperatureSchedule.invalidate();
      setTime("22:00");
      setTemperature(0);
    },
  });

  const updateMutation = apiR.user.updateTemperatureSchedule.useMutation({
    onSuccess: () => {
      void utils.user.getTemperatureSchedule.invalidate();
      setEditingId(null);
      setTime("22:00");
      setTemperature(0);
    },
  });

  const deleteMutation = apiR.user.deleteTemperatureSchedule.useMutation({
    onSuccess: () => {
      void utils.user.getTemperatureSchedule.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, time, temperature });
    } else {
      addMutation.mutate({ time, temperature });
    }
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setTime(entry.time);
    setTemperature(entry.temperature);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this schedule entry?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setTime("22:00");
    setTemperature(0);
  };

  const entries = scheduleQuery.data ?? [];

  return (
    <div className="mx-auto mt-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="mb-3 text-center text-xl font-bold text-gray-800">
        Custom Temperature Schedule
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        Add time points to set exact temperatures throughout the night.
        The last active schedule before the current time will be used.
        If no schedule is set, the default profile stages will apply.
      </p>

      <form onSubmit={handleSubmit} className="mb-4 space-y-3">
        <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
                Time
              </label>
              <input
                id="scheduleTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="scheduleTemperature" className="block text-sm font-medium text-gray-700">
                Temperature (-10 to 10)
              </label>
              <input
                id="scheduleTemperature"
                type="number"
                min={-10}
                max={10}
                step={1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
          <div className="flex-1">
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
              Temperature (-10 to 10)
            </label>
            <input
              id="temperature"
              type="number"
              min={-10}
              max={10}
              step={1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {editingId !== null ? "Update" : "Add"}
            </Button>
            {editingId !== null && (
              <Button
                type="button"
                onClick={handleCancel}
                className="rounded-md bg-gray-500 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-800">
                {entry.time} &rarr; {entry.temperature > 0 ? "+" : ""}
                {entry.temperature}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleEdit(entry)}
                  className="rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-gray-500">
          No custom schedule entries yet. Add some to override the default stages.
        </p>
      )}
    </div>
  );
};
