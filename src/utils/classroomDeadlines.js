// src/utils/classroomDeadlines.js
import { detectDeadlineType } from './deadlineTypes';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const subjectCode = (value) => {
  const normalized = normalizeText(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
  const match = normalized.match(/^([a-z]+(?:-[a-z]+)?)\s*-?\s*(\d{2,4}[a-z]?)(?:\b|\s|$)/i);

  return match ? `${match[1]} ${match[2]}` : '';
};

const parseMaterials = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : parsed?.materials || [];
  } catch {
    return [];
  }
};

export const classroomAttachments = (content) => {
  const materials = [
    ...(Array.isArray(content?.attachments) ? content.attachments : []),
    ...(Array.isArray(content?.materials) ? content.materials : []),
    ...parseMaterials(content?.materialsJson),
  ];

  return materials.map((item, index) => {
    const driveFile = item?.driveFile?.driveFile || item?.driveFile;
    const url = driveFile?.alternateLink || item?.link?.url ||
      item?.form?.formUrl || item?.youtubeVideo?.alternateLink || item?.url;

    if (!url) return null;

    return {
      url,
      name: driveFile?.title || item?.link?.title || item?.form?.title ||
        item?.youtubeVideo?.title || item?.name || item?.title ||
        `Attachment ${index + 1}`,
    };
  }).filter(Boolean);
};

export const findSubjectForClassroomContent = (content, subjects = []) => {
  const name = normalizeText(content?.subjectName);
  const code = subjectCode(content?.subjectName);
  const courseId = String(
    content?.courseId || content?.classroomCourseId || content?.googleCourseId || ''
  ).trim();

  return subjects.find((subject) => {
    if (courseId && String(subject?.classroomCourseId || '').trim() === courseId) {
      return true;
    }
    const subjectName = normalizeText(subject?.name);
    const savedCode = subjectCode(subject?.name);
    return subjectName === name || (code && savedCode && savedCode === code);
  });
};

export const getClassroomDueDate = (content) => {
  if (!content?.dueYear || !content?.dueMonth || !content?.dueDay) {
    return null;
  }

  const year = Number(content.dueYear);
  const month = Number(content.dueMonth) - 1;
  const day = Number(content.dueDay);
  const hasExplicitTime =
    content.dueHour != null || content.dueMinute != null;
  const hour = Number(content.dueHour ?? 23);
  const minute = Number(content.dueMinute ?? 59);

  // Synced hour/minute values are UTC; a missing time defaults to local end of day.
  const dueDate = hasExplicitTime
    ? new Date(Date.UTC(year, month, day, hour, minute))
    : new Date(year, month, day, hour, minute);

  return Number.isNaN(dueDate.getTime()) ? null : dueDate;
};

export const toClassroomDeadline = (content, subjects = []) => {
  if (content?.contentType !== 'coursework') return null;
  const dueDate = getClassroomDueDate(content);
  if (!dueDate) return null;

  const subject = findSubjectForClassroomContent(content, subjects);
  const title = content.title || 'Google Classroom Activity';
  const description = content.description || '';

  return {
    ...content,
    id: `classroom-${content.id}`,
    classroomDocumentId: content.id,
    isClassroom: true,
    readOnly: true,
    subjectName: subject?.name || content.subjectName || 'Google Classroom',
    subjectColor: subject?.color || 'bg-slate-500',
    title,
    description,
    dueDate: dueDate.toISOString(),
    attachments: classroomAttachments(content),
    // 🔽 Auto-detected type from title/description
    type: detectDeadlineType(title, description),
  };
};

export const buildClassroomDeadlines = (contents = [], subjects = []) =>
  contents.map((content) => toClassroomDeadline(content, subjects)).filter(Boolean);