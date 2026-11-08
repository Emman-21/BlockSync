// src/utils/deadlineTypes.js

export const DEADLINE_TYPES = {
  REGULAR: 'regular',
  LABORATORY: 'laboratory',
  QUIZ: 'quiz',
  FINAL_PROJECT: 'final-project',
};

export const DEADLINE_TYPE_OPTIONS = [
  { value: DEADLINE_TYPES.REGULAR, label: 'Regular Deadline', color: '#ef4444' },
  { value: DEADLINE_TYPES.LABORATORY, label: 'Laboratory', color: '#f97316' },
  { value: DEADLINE_TYPES.QUIZ, label: 'Quiz', color: '#06b6d4' },
  { value: DEADLINE_TYPES.FINAL_PROJECT, label: 'Final Project', color: '#ec4899' },
];

export const DEADLINE_TYPE_MAP = DEADLINE_TYPE_OPTIONS.reduce((map, option) => {
  map[option.value] = option;
  return map;
}, {});

export const getDeadlineTypeLabel = (type) =>
  DEADLINE_TYPE_MAP[type]?.label || 'Deadline';

export const getDeadlineTypeColor = (type) =>
  DEADLINE_TYPE_MAP[type]?.color || '#ef4444';

export const getDeadlineTypeTone = (type) => {
  switch (type) {
    case DEADLINE_TYPES.LABORATORY:
      return 'laboratory';
    case DEADLINE_TYPES.QUIZ:
      return 'quiz';
    case DEADLINE_TYPES.FINAL_PROJECT:
      return 'final-project';
    default:
      return 'neutral';
  }
};

export const isSpecialDeadlineType = (type) =>
  type && type !== DEADLINE_TYPES.REGULAR;

/**
 * Auto-detects the deadline type from title/description.
 * Used to auto-classify Google Classroom coursework.
 */
export const detectDeadlineType = (title = '', description = '') => {
  const text = `${title} ${description}`.toLowerCase();

  if (
    /\b(final\s+project|capstone|thesis|final\s+output|final\s+requirement|final\s+presentation|project\s+defense|final\s+defense)\b/.test(
      text
    )
  ) {
    return DEADLINE_TYPES.FINAL_PROJECT;
  }

  if (
    /\b(quiz|quizzes|short\s+quiz|long\s+quiz|seatwork|seat\s+work|short\s+test|graded\s+recitation)\b/.test(
      text
    )
  ) {
    return DEADLINE_TYPES.QUIZ;
  }

  if (
    /\b(lab|laboratory|lab\s+activity|lab\s+exercise|lab\s+report|machine\s+problem|hands[\s-]?on|practical\s+exam)\b/.test(
      text
    )
  ) {
    return DEADLINE_TYPES.LABORATORY;
  }

  return DEADLINE_TYPES.REGULAR;
};