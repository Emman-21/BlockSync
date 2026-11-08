import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

const EMPTY = { title: "", description: "", pinned: false };

export default function AnnouncementForm({ initial, onSubmit, onCancel, submitting }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [initial]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      authorRef: user?.uid,
      authorName: profile?.fullName || user?.email?.split("@")[0] || "Admin",
    });
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
          placeholder="e.g. Class suspended tomorrow"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          required
          rows={4}
          className={inputClass}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.pinned}
          onChange={(e) => update("pinned", e.target.checked)}
          className="accent-accent w-4 h-4"
        />
        Pin this announcement
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting..." : initial ? "Save changes" : "Post announcement"}
        </Button>
      </div>
    </form>
  );
}
