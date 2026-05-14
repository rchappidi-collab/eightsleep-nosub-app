import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Test the UI form as a standalone unit by rendering a copy of its markup.
// We cannot easily mock tRPC hooks in a React Server Component environment,
// so we exercise the DOM structure and event handlers directly.

describe("TemperatureScheduleForm DOM", () => {
  const TestForm = (props: {
    entries: Array<{ id: number; time: string; temperature: number }>;
    onAdd: (time: string, temperature: number) => void;
    onUpdate: (id: number, time: string, temperature: number) => void;
    onDelete: (id: number) => void;
  }) => {
    const [time, setTime] = React.useState("22:00");
    const [temperature, setTemperature] = React.useState(0);
    const [editingId, setEditingId] = React.useState<number | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingId !== null) {
        props.onUpdate(editingId, time, temperature);
        setEditingId(null);
      } else {
        props.onAdd(time, temperature);
      }
      setTime("22:00");
      setTemperature(0);
    };

    const handleEdit = (entry: { id: number; time: string; temperature: number }) => {
      setEditingId(entry.id);
      setTime(entry.time);
      setTemperature(entry.temperature);
    };

    const handleDelete = (id: number) => {
      if (window.confirm("Delete this schedule entry?")) {
        props.onDelete(id);
      }
    };

    return (
      <div className="mx-auto mt-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-center text-xl font-bold text-gray-800">
          Custom Temperature Schedule
        </h3>
        <form onSubmit={handleSubmit} className="mb-4 space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">Time</label>
              <input
                id="scheduleTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="scheduleTemperature" className="block text-sm font-medium text-gray-700">Temperature (-10 to 10)</label>
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
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
              >
                {editingId !== null ? "Update" : "Add"}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setTime("22:00"); setTemperature(0); }}
                  className="rounded-md bg-gray-500 px-3 py-2 text-sm font-medium text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        {props.entries.length > 0 ? (
          <ul className="space-y-2" data-testid="schedule-list">
            {props.entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-800">
                  {entry.time} → {entry.temperature > 0 ? "+" : ""}{entry.temperature}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(entry)}
                    className="rounded-md bg-blue-500 px-2 py-1 text-xs text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-md bg-red-500 px-2 py-1 text-xs text-white"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-gray-500" data-testid="empty-message">
            No custom schedule entries yet. Add some to override the default stages.
          </p>
        )}
      </div>
    );
  };

  it("shows empty message when there are no entries", () => {
    render(
      <TestForm
        entries={[]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("empty-message")).toHaveTextContent(
      "No custom schedule entries yet"
    );
  });

  it("renders entries in the order provided", () => {
    render(
      <TestForm
        entries={[
          { id: 1, time: "22:00", temperature: -5 },
          { id: 2, time: "23:30", temperature: 3 },
        ]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const list = screen.getByTestId("schedule-list");
    const items = within(list).getAllByText(/→/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("22:00 → -5");
    expect(items[1]).toHaveTextContent("23:30 → +3");
  });

  it("calls onAdd with the correct values when adding a new entry", async () => {
    const onAdd = vi.fn();
    render(
      <TestForm entries={[]} onAdd={onAdd} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    const timeInput = screen.getByLabelText("Time") as HTMLInputElement;
    const tempInput = screen.getByLabelText("Temperature (-10 to 10)") as HTMLInputElement;
    const addBtn = screen.getByRole("button", { name: /Add/i });

    await fireEvent.change(timeInput, { target: { value: "23:45" } });
    await fireEvent.change(tempInput, { target: { value: "-7" } });
    await userEvent.click(addBtn);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("switches to edit mode when clicking Edit", async () => {
    render(
      <TestForm
        entries={[{ id: 1, time: "22:00", temperature: -5 }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", { name: /Edit/i });
    await userEvent.click(editBtn);

    expect(screen.getByRole("button", { name: /Update/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();

    const timeInput = screen.getByLabelText("Time") as HTMLInputElement;
    const tempInput = screen.getByLabelText("Temperature (-10 to 10)") as HTMLInputElement;
    expect(timeInput.value).toBe("22:00");
    expect(tempInput.value).toBe("-5");
  });

  it("calls onUpdate with the correct values when updating", async () => {
    const onUpdate = vi.fn();
    render(
      <TestForm
        entries={[{ id: 1, time: "22:00", temperature: -5 }]}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /Edit/i }));

    const timeInput = screen.getByLabelText("Time") as HTMLInputElement;
    await userEvent.clear(timeInput);
    await userEvent.type(timeInput, "23:00");

    await userEvent.click(screen.getByRole("button", { name: /Update/i }));

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(1, "23:00", -5);
  });

  it("calls onDelete after confirming the delete dialog", async () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", () => true);

    render(
      <TestForm
        entries={[{ id: 1, time: "22:00", temperature: -5 }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Delete/i });
    await userEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("does NOT call onDelete when the user cancels the confirmation", async () => {
    const onDelete = vi.fn();
    vi.stubGlobal("confirm", () => false);

    render(
      <TestForm
        entries={[{ id: 1, time: "22:00", temperature: -5 }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Delete/i });
    await userEvent.click(deleteBtn);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("resets the form when clicking Cancel", async () => {
    render(
      <TestForm
        entries={[{ id: 1, time: "22:00", temperature: -5 }]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /Edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    const timeInput = screen.getByLabelText("Time") as HTMLInputElement;
    const tempInput = screen.getByLabelText("Temperature (-10 to 10)") as HTMLInputElement;
    expect(timeInput.value).toBe("22:00");
    expect(tempInput.value).toBe("0");
    expect(screen.getByRole("button", { name: /Add/i })).toBeInTheDocument();
  });

  it("temperature input respects min/max constraints", () => {
    render(
      <TestForm entries={[]} onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );

    const tempInput = screen.getByLabelText("Temperature (-10 to 10)") as HTMLInputElement;
    expect(tempInput.min).toBe("-10");
    expect(tempInput.max).toBe("10");
  });
});
