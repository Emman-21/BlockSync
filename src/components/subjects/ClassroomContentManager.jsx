import { LoadingContent, ContentSkeleton } from "../ui/Skeleton";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  School,
} from "lucide-react";

import Card from "../ui/Card";
import {
  CLASSROOM_PLACEMENTS,
} from "../../services/classroomContentService";
import {
  useClassroomContentsStore,
} from "../../store/useClassroomContentsStore";

const PLACEMENT_OPTIONS = [
  {
    value: CLASSROOM_PLACEMENTS.SUBJECT,
    label: "Subject",
  },
  {
    value: CLASSROOM_PLACEMENTS.ANNOUNCEMENT,
    label: "Announcement",
  },
  {
    value: CLASSROOM_PLACEMENTS.DEADLINE,
    label: "Deadline",
  },
  {
    value: CLASSROOM_PLACEMENTS.HIDDEN,
    label: "Hidden",
  },
];

const formatContentType = (contentType) => {
  if (contentType === "coursework") {
    return "Coursework";
  }

  if (contentType === "announcement") {
    return "Classroom announcement";
  }

  if (contentType === "material") {
    return "Material";
  }

  return "Classroom content";
};

export default function ClassroomContentManager() {
  const {
    contents,
    loading,
    unsubscribe: subscription,
    error,
    updatingIds,
    load,
    updatePlacement,
  } = useClassroomContentsStore();

  const [filter, setFilter] = useState("all");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const filteredContents = useMemo(() => {
    if (filter === "all") {
      return contents;
    }

    return contents.filter(
      (content) => content.placement === filter
    );
  }, [contents, filter]);

  const handlePlacementChange = async (
    content,
    placement
  ) => {
    setLocalError("");

    try {
      await updatePlacement(content.id, placement);
    } catch (updateError) {
      setLocalError(
        updateError?.message ||
          "Unable to update content placement."
      );
    }
  };

  return (
    <Card hoverable={false}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <School className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Google Classroom Content
              </h2>

              <p className="mt-0.5 text-xs text-text-secondary">
                Choose where imported items appear in the app. Hidden items stay saved and can be restored here; this does not change Google Classroom.
              </p>
            </div>
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
            className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="all">All content</option>

            {PLACEMENT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {(error || localError) && (
          <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{localError || error}</span>
          </div>
        )}

        <LoadingContent loading={loading || (!subscription && !error)} hasData={contents.length > 0} error={error} errorFallback={null} label="Classroom content" skeleton={<ContentSkeleton kind="classroom" count={3} />}>{filteredContents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">
              No Classroom content found
            </p>

            <p className="mt-1 text-xs text-text-secondary">
              Run the Make scenario to import content.
            </p>
          </div>
        ) : (
          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {filteredContents.map((content) => {
              const updating = updatingIds.includes(
                content.id
              );

              return (
                <div
                  key={content.id}
                  className="rounded-xl border border-border bg-bg-muted p-3"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
                          {formatContentType(
                            content.contentType
                          )}
                        </span>

                        <span className="text-xs text-text-secondary">
                          {content.subjectName ||
                            "Unknown subject"}
                        </span>
                      </div>

                      <p className="mt-2 font-medium text-text-primary">
                        {content.title ||
                          "Untitled Classroom content"}
                      </p>

                      {content.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                          {content.description}
                        </p>
                      )}

                      {content.alternateLink && (
                        <a
                          href={content.alternateLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                        >
                          Open in Google Classroom
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {updating && (
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      )}

                      <select
                        value={
                          content.placement || "subject"
                        }
                        disabled={updating}
                        onChange={(event) =>
                          handlePlacementChange(
                            content,
                            event.target.value
                          )
                        }
                        className="min-w-36 rounded-xl border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      >
                        {PLACEMENT_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}</LoadingContent>
      </div>
    </Card>
  );
}