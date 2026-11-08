import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { PRIORITY, DEADLINE_STATUS } from "../../utils/constants";

const EMPTY = { title: "", description: "", subjectName: "", dueDate: "", priority: PRIORITY.MEDIUM, status: DEADLINE_STATUS.UPCOMING };

export default function DeadlineForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (initial) {
      setForm({
        ...EMPTY,
        ...initial,
        dueDate: initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 16) : "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [initial]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, dueDate: new Date(form.dueDate) });
  }

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent";
  const labelClass = "text-xs font-medium text-text-secondary mb-1.5 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>Title</label>
        <input
          required
          className={inputClass}
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Database Assignment"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          rows={2}
          className={inputClass}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Subject</label>
          <input
            className={inputClass}
            value={form.subjectName}
            onChange={(e) => update("subjectName", e.target.value)}
            placeholder="e.g. Networking"
          />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select className={inputClass} value={form.priority} onChange={(e) => update("priority", e.target.value)}>
            <option value={PRIORITY.LOW}>Low</option>
            <option value={PRIORITY.MEDIUM}>Medium</option>
            <option value={PRIORITY.HIGH}>High</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Due date & time</label>
        <input
          type="datetime-local"
          required
          className={inputClass}
          value={form.dueDate}
          onChange={(e) => update("dueDate", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add deadline"}
        </Button>
      </div>
    </form>
  );
}
