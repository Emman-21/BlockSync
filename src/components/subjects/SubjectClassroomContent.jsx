import { LoadingContent, ContentSkeleton } from "../ui/Skeleton";
import { useEffect, useMemo } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";

import Card from "../ui/Card";
import RichTextContent from "../ui/RichTextContent";
import { useClassroomContentsStore } from "../../store/useClassroomContentsStore";
import { useAnnouncementsStore } from "../../store/useAnnouncementsStore";
import { getClassroomDueDate } from "../../utils/classroomDeadlines";

const normalizeSubjectName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getSubjectCode = (value) =>
  normalizeSubjectName(value)
    .match(/[a-z]+\s*\d+/)?.[0]
    ?.replace(/\s+/g, "");

const getContentTimestamp = (content) => {
  const value =
    content.updatedAt ||
    content.createdAt ||
    content.datePosted;

  if (!value) {
    return 0;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatContentTimestamp = (content) => {
  const timestamp = getContentTimestamp(content);

  if (!timestamp) {
    return "Upload date unavailable";
  }

  return new Date(timestamp).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getContentLabel = (contentType) => {
  if (contentType === "coursework") {
    return "Coursework";
  }

  if (contentType === "material") {
    return "Material";
  }

  if (contentType === "announcement") {
    return "Classroom announcement";
  }

  return "Classroom content";
};

const parseMaterialsJson = (materialsJson) => {
  if (!materialsJson) {
    return [];
  }

  try {
    const parsed =
      typeof materialsJson === "string"
        ? JSON.parse(materialsJson)
        : materialsJson;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.materials)) {
      return parsed.materials;
    }

    return [];
  } catch (error) {
    console.error(
      "Unable to parse Google Classroom materials:",
      error
    );

    return [];
  }
};

const getMaterialLinks = (content) => {
  const materials = [
    ...(Array.isArray(content.materials)
      ? content.materials
      : []),
    ...(Array.isArray(content.attachments)
      ? content.attachments
      : []),
    ...parseMaterialsJson(content.materialsJson),
  ];

  return materials
    .map((item, index) => {
      const driveFile =
        item?.driveFile?.driveFile ||
        item?.driveFile;

      const link = item?.link;
      const form = item?.form;
      const youtubeVideo = item?.youtubeVideo;

      const url =
        driveFile?.alternateLink ||
        link?.url ||
        form?.formUrl ||
        form?.responseUrl ||
        youtubeVideo?.alternateLink ||
        item?.url;

      if (!url) {
        return null;
      }

      const name =
        driveFile?.title ||
        link?.title ||
        form?.title ||
        youtubeVideo?.title ||
        item?.title ||
        item?.name ||
        `Attachment ${index + 1}`;

      const type = driveFile
        ? "driveFile"
        : link
          ? "link"
          : form
            ? "form"
            : youtubeVideo
              ? "youtubeVideo"
              : "attachment";

      const thumbnailUrl =
        driveFile?.thumbnailUrl ||
        link?.thumbnailUrl ||
        form?.thumbnailUrl ||
        youtubeVideo?.thumbnailUrl ||
        item?.thumbnailUrl ||
        "";

      return {
        url,
        name,
        type,
        thumbnailUrl,
      };
    })
    .filter(Boolean);
};

export default function SubjectClassroomContent({
  subjectName,
}) {
  const {
    contents,
    loading,
    unsubscribe: subscription,
    error,
    load,
  } = useClassroomContentsStore();

  const {
    announcements,
    load: loadAnnouncements,
  } = useAnnouncementsStore();

  useEffect(() => {
    load();
    loadAnnouncements();
  }, [load, loadAnnouncements]);

  const subjectContents = useMemo(() => {
    const normalizedCurrentSubject =
      normalizeSubjectName(subjectName);

    const currentSubjectCode =
      getSubjectCode(subjectName);

    const classroomItems = contents
      .filter((content) => {
        const normalizedContentSubject =
          normalizeSubjectName(content.subjectName);

        const contentSubjectCode =
          getSubjectCode(content.subjectName);

        const sameSubjectName =
          normalizedContentSubject ===
          normalizedCurrentSubject;

        const sameSubjectCode =
          currentSubjectCode &&
          contentSubjectCode &&
          currentSubjectCode === contentSubjectCode;

        return sameSubjectName || sameSubjectCode;
      })
      .sort(
        (first, second) =>
          getContentTimestamp(second) -
          getContentTimestamp(first)
      );

    const authoredItems = announcements
      .filter((announcement) => {
        const announcementName =
          normalizeSubjectName(
            announcement.subjectName
          );

        const announcementCode =
          getSubjectCode(
            announcement.subjectName
          );

        return (
          announcementName ===
            normalizedCurrentSubject ||
          (
            currentSubjectCode &&
            announcementCode ===
              currentSubjectCode
          )
        );
      })
      .map((announcement) => ({
        ...announcement,
        id: `announcement-${announcement.id}`,
        isClassroom: false,
        contentType: "announcement",
      }));

    return [
      ...classroomItems,
      ...authoredItems,
    ].sort(
      (first, second) =>
        getContentTimestamp(second) -
        getContentTimestamp(first)
    );
  }, [
    announcements,
    contents,
    subjectName,
  ]);

  

  

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />

        <div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            Google Classroom
          </h3>

          <p className="text-xs text-text-secondary">
            Announcements, coursework, and materials
            for this subject
          </p>
        </div>
      </div>

      <LoadingContent key={subjectName} loading={loading || (!subscription && !error)} hasData={subjectContents.length > 0} error={error} label="Google Classroom content" skeleton={<ContentSkeleton kind="classroom" count={3} />}>
{subjectContents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-text-secondary" />

          <p className="mt-2 text-sm font-medium text-text-primary">
            No Google Classroom content
          </p>

          <p className="mt-1 text-xs text-text-secondary">
            Imported content matching this subject
            will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjectContents.map((content) => {
            const dueDate = getClassroomDueDate(content);

            const materialLinks =
              getMaterialLinks(content);

            return (
              <div
                key={content.id}
                className="rounded-xl border border-border bg-bg-muted p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
                        {getContentLabel(
                          content.contentType
                        )}
                      </span>

                      {content.subjectName && (
                        <span className="text-xs text-text-secondary">
                          {content.subjectName}
                        </span>
                      )}

                      <span className="text-xs text-text-secondary">
                        {content.isClassroom
                          ? "Uploaded"
                          : "Posted"}
                        :{" "}
                        {formatContentTimestamp(
                          content
                        )}
                      </span>
                    </div>

                    <h4 className="mt-2 font-medium text-text-primary">
                      {content.title ||
                        "Untitled Classroom content"}
                    </h4>

                    {content.description && (
                      <RichTextContent
                        html={content.description}
                        className="mt-1 text-sm text-text-secondary"
                      />
                    )}

                    {dueDate && (
                      <p className="mt-2 text-xs font-medium text-status-warning">
                        Due:{" "}
                        {dueDate.toLocaleString(
                          "en-PH",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        )}
                      </p>
                    )}

                    {materialLinks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {materialLinks.map(
                          (file) => (
                            <a
                              key={`${content.id}-${file.url}`}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
                            >
                              <FileText className="h-3.5 w-3.5" />

                              {file.name}

                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {content.alternateLink && (
                    <a
                      href={content.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-border bg-bg-surface px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent-soft"
                    >
                      Open content

                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
</LoadingContent>
    </Card>
  );
}