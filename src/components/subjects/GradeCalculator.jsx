import { draftStorage, draftKey } from '../../offline/device';
import { useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  Calculator,
  Plus,
  Trash2,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Info,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const createAssessment = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '',
  score: '',
  maxScore: '',
});

const normalizeTitle = (title = '') => {
  return title.trim().toLowerCase();
};

const sanitizeStoragePart = (value, fallback) => {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-');
};

const getStorageKey = (subjectId, userIdentity) => {
  const safeSubjectId = subjectId || 'unknown-subject';
  const safeUserIdentity = sanitizeStoragePart(
    userIdentity,
    'anonymous-student'
  );

  return draftKey(userIdentity || "none", `grade-calculator:${safeSubjectId}`);
};

const getLegacyStorageKey = (subjectId, userName) => {
  const safeSubjectId = subjectId || 'unknown-subject';
  const safeUserName = sanitizeStoragePart(userName, 'student');

  return `grade-calculator:${safeSubjectId}:${safeUserName}`;
};

const buildCategories = (categorySeed = [], savedCategories = []) => {
  return categorySeed.map((item, index) => {
    const savedCategory = savedCategories.find(
      (category) =>
        normalizeTitle(category.title) ===
        normalizeTitle(item.title)
    );

    return {
      id: savedCategory?.id || `${item.title}-${index}`,
      title: item.title || `Category ${index + 1}`,
      percentage: Number(item.percentage) || 0,
      assessments:
        savedCategory?.assessments?.length > 0
          ? savedCategory.assessments
          : [createAssessment()],
    };
  });
};

const readSavedCalculator = (storageKey) => {
  try {
    const savedValue = draftStorage().getItem(storageKey);

    if (!savedValue) {
      return null;
    }

    return JSON.parse(savedValue);
  } catch (error) {
    console.warn('Unable to load grade-calculator data:', error);
    return null;
  }
};

const saveCalculator = (storageKey, value) => {
  try {
    draftStorage().setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to save grade-calculator data:', error);
  }
};

const getValidAssessments = (assessments = []) => {
  return assessments.filter((assessment) => {
    const score = Number(assessment.score);
    const maxScore = Number(assessment.maxScore);

    return (
      assessment.score !== '' &&
      assessment.maxScore !== '' &&
      Number.isFinite(score) &&
      Number.isFinite(maxScore) &&
      maxScore > 0 &&
      score >= 0
    );
  });
};

const calculateRawCategoryPercentage = (assessments = []) => {
  const validAssessments = getValidAssessments(assessments);

  if (validAssessments.length === 0) {
    return null;
  }

  const totalScore = validAssessments.reduce(
    (total, assessment) =>
      total + Number(assessment.score),
    0
  );

  const totalMaximum = validAssessments.reduce(
    (total, assessment) =>
      total + Number(assessment.maxScore),
    0
  );

  if (totalMaximum <= 0) {
    return null;
  }

  return (totalScore / totalMaximum) * 100;
};

const migrateLegacyCalculator = (legacyKey, storageKey) => {
  try {
    if (draftStorage().getItem(storageKey)) {
      return;
    }

    const legacyValue = draftStorage().getItem(legacyKey);

    if (!legacyValue) {
      return;
    }

    draftStorage().setItem(storageKey, legacyValue);
    draftStorage().removeItem(legacyKey);
  } catch (error) {
    console.warn('Unable to migrate grade-calculator data:', error);
  }
};

const transmuteGrade = (rawPercentage) => {
  if (!Number.isFinite(rawPercentage)) {
    return null;
  }

  return (rawPercentage / 100) * 62.5 + 37.5;
};

const calculateCategoryGrade = (assessments = []) => {
  const rawPercentage = calculateRawCategoryPercentage(assessments);

  if (rawPercentage === null) {
    return {
      rawPercentage: null,
      transmutedGrade: null,
    };
  }

  return {
    rawPercentage,
    transmutedGrade: transmuteGrade(rawPercentage),
  };
};

const formatGrade = (grade) => {
  if (!Number.isFinite(grade)) {
    return '0.00';
  }

  return grade.toFixed(2);
};

const getGradeStatus = (grade) => {
  if (grade >= 90) {
    return {
      label: 'Excellent',
      color: 'text-emerald-500',
      background: 'bg-emerald-500/10',
    };
  }

  if (grade >= 85) {
    return {
      label: 'Very Good',
      color: 'text-blue-500',
      background: 'bg-blue-500/10',
    };
  }

  if (grade >= 80) {
    return {
      label: 'Good',
      color: 'text-violet-500',
      background: 'bg-violet-500/10',
    };
  }

  if (grade >= 75) {
    return {
      label: 'Passing',
      color: 'text-amber-500',
      background: 'bg-amber-500/10',
    };
  }

  return {
    label: 'Needs Improvement',
    color: 'text-red-500',
    background: 'bg-red-500/10',
  };
};

const getCollegeGradeEquivalent = (average) => {
  if (!Number.isFinite(average) || average < 75) {
    return 5.0;
  }

  const normalizedAverage = Math.min(100, average);

  if (normalizedAverage >= 98) return 1.0;
  if (normalizedAverage >= 94) return 1.25;
  if (normalizedAverage >= 90) return 1.5;
  if (normalizedAverage >= 88) return 1.75;
  if (normalizedAverage >= 85) return 2.0;
  if (normalizedAverage >= 83) return 2.25;
  if (normalizedAverage >= 80) return 2.5;
  if (normalizedAverage >= 78) return 2.75;
  return 3.0;
};

const GRADE_CRITERIA = [
  { range: '98–100', equivalent: 1.0, target: 98 },
  { range: '94–97.99', equivalent: 1.25, target: 94 },
  { range: '90–93.99', equivalent: 1.5, target: 90 },
  { range: '88–89.99', equivalent: 1.75, target: 88 },
  { range: '85–87.99', equivalent: 2.0, target: 85 },
  { range: '83–84.99', equivalent: 2.25, target: 83 },
  { range: '80–82.99', equivalent: 2.5, target: 80 },
  { range: '78–79.99', equivalent: 2.75, target: 78 },
  { range: '75–77.99', equivalent: 3.0, target: 75 },
  { range: 'Below 75', equivalent: 5.0, target: 74.99 },
];

export default function GradeCalculator({ subject }) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const storageKey = useMemo(() => {
    return getStorageKey(subject?.id, user?.uid);
  }, [subject?.id, user?.uid]);

  const legacyStorageKey = useMemo(() => {
    return getLegacyStorageKey(subject?.id, user?.name);
  }, [subject?.id, user?.name]);

  const categorySeed = useMemo(() => {
    return Array.isArray(subject?.syllabusItems)
      ? subject.syllabusItems
      : [];
  }, [subject?.syllabusItems]);

  const [categories, setCategories] = useState([]);
  const [targetGrade, setTargetGrade] = useState(75);
  const [loadedStorageKey, setLoadedStorageKey] = useState('');

  useEffect(() => {
    // Old name-keyed records are intentionally not imported across identities.
    const savedCalculator = readSavedCalculator(storageKey);

    setCategories(
      buildCategories(
        categorySeed,
        savedCalculator?.categories || []
      )
    );

    setTargetGrade(savedCalculator?.targetGrade ?? 75);
    setLoadedStorageKey(storageKey);
  }, [legacyStorageKey, storageKey, categorySeed]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) {
      return;
    }

    saveCalculator(storageKey, {
      categories,
      targetGrade,
      updatedAt: new Date().toISOString(),
    });
  }, [
    categories,
    targetGrade,
    storageKey,
    loadedStorageKey,
  ]);

  const totalCategoryWeight = useMemo(() => {
    return categories.reduce(
      (total, category) =>
        total + Number(category.percentage || 0),
      0
    );
  }, [categories]);

  const categoryResults = useMemo(() => {
    return categories.map((category) => {
      const { rawPercentage, transmutedGrade } = calculateCategoryGrade(
        category.assessments
      );

      const percentage = Number(category.percentage) || 0;

      const contribution =
        transmutedGrade === null
          ? 0
          : transmutedGrade * (percentage / 100);

      return {
        ...category,
        rawPercentage,
        average: transmutedGrade,
        contribution,
        hasGrade: transmutedGrade !== null,
      };
    });
  }, [categories]);

  const completedWeight = useMemo(() => {
    return categoryResults.reduce((total, category) => {
      if (!category.hasGrade) {
        return total;
      }

      return total + Number(category.percentage || 0);
    }, 0);
  }, [categoryResults]);

  const earnedWeightedGrade = useMemo(() => {
    return categoryResults.reduce(
      (total, category) =>
        total + category.contribution,
      0
    );
  }, [categoryResults]);

  const currentStanding =
    completedWeight > 0
      ? (earnedWeightedGrade / completedWeight) * 100
      : 0;

  const remainingWeight = Math.max(
    0,
    totalCategoryWeight - completedWeight
  );

  const requiredRemainingAverage =
    remainingWeight > 0
      ? ((Number(targetGrade) - earnedWeightedGrade) /
          remainingWeight) *
        100
      : null;

  const status = getGradeStatus(currentStanding);
  const collegeGradeEquivalent =
    completedWeight > 0
      ? getCollegeGradeEquivalent(currentStanding)
      : null;

  const updateAssessment = (
    categoryId,
    assessmentId,
    field,
    value
  ) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) => {
        if (category.id !== categoryId) {
          return category;
        }

        return {
          ...category,
          assessments: category.assessments.map(
            (assessment) =>
              assessment.id === assessmentId
                ? {
                    ...assessment,
                    [field]: value,
                  }
                : assessment
          ),
        };
      })
    );
  };

  const addAssessment = (categoryId) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              assessments: [
                ...category.assessments,
                createAssessment(),
              ],
            }
          : category
      )
    );
  };

  const deleteAssessment = (
    categoryId,
    assessmentId
  ) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) => {
        if (category.id !== categoryId) {
          return category;
        }

        const remainingAssessments =
          category.assessments.filter(
            (assessment) =>
              assessment.id !== assessmentId
          );

        return {
          ...category,
          assessments:
            remainingAssessments.length > 0
              ? remainingAssessments
              : [createAssessment()],
        };
      })
    );
  };

  const resetCalculator = () => {
    const confirmed = window.confirm(
      `Reset all saved grades for ${subject?.name || 'this subject'}?`
    );

    if (!confirmed) {
      return;
    }

    draftStorage().removeItem(storageKey);

    setCategories(buildCategories(categorySeed));
    setTargetGrade(75);
  };

  if (categories.length === 0) {
    return (
      <section id="grade-calculator" className="scroll-mt-24 rounded-2xl border border-border bg-bg-surface p-5 sm:p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Calculator className="h-7 w-7" />
          </div>

          <h3 className="font-display text-lg font-semibold text-text-primary">
            Grade Calculator
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
            Add your grading categories and percentage
            weights before using the calculator.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="grade-calculator" className="scroll-mt-24 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-accent" />

            <h3 className="font-display text-lg font-semibold text-text-primary">
              Grade Calculator
            </h3>
          </div>

          <p className="mt-1 text-sm text-text-secondary">
            Calculate your grade using your set category weights.
          </p>
        </div>

        <button
          type="button"
          onClick={resetCalculator}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-border px-3 text-sm font-medium text-text-secondary transition hover:border-status-danger/30 hover:bg-status-danger/10 hover:text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />

        <div>
          <p className="text-sm font-semibold text-text-primary">
            Grade transmutation formula
          </p>

          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Transmuted grade = (score ÷ maximum score × 62.5) + 37.5
          </p>

          <p className="text-xs leading-5 text-text-secondary">
            Weighted contribution = transmuted grade × (category percentage ÷ 100)
          </p>

          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-text-primary">
              Grade criteria
            </p>

            <div className="flex flex-wrap gap-2">
              {GRADE_CRITERIA.map((criterion) => {
                const isCurrentGrade =
                  collegeGradeEquivalent === criterion.equivalent;

                return (
                  <button
                    key={criterion.equivalent}
                    type="button"
                    onClick={() => setTargetGrade(criterion.target)}
                    title={`Set ${criterion.target}% as target grade`}
                    aria-pressed={isCurrentGrade}
                    className={`rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                      isCurrentGrade
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-border bg-bg-surface hover:border-accent/50 hover:bg-accent-soft'
                    }`}
                  >
                    <span
                      className={`block text-[11px] ${
                        isCurrentGrade
                          ? 'text-white/80'
                          : 'text-text-secondary'
                      }`}
                    >
                      {criterion.range}%
                    </span>
                    <strong className="block text-sm font-extrabold">
                      {criterion.equivalent.toFixed(2)}
                    </strong>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[11px] leading-5 text-text-secondary">
              Select a criterion to use its minimum percentage as your target.
              Your current equivalent is highlighted automatically.
            </p>
          </div>
        </div>
      </div>

      {totalCategoryWeight !== 100 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Category weight is {totalCategoryWeight}%
            </p>

            <p className="mt-1 text-xs leading-5 text-text-secondary">
              For an accurate final grade, the category
              percentages should total exactly 100%.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Current standing
          </p>

          <p className="mt-2 text-2xl font-bold text-text-primary">
            {formatGrade(currentStanding)}%
          </p>

          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.background} ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Grade equivalent
          </p>

          <p className={`mt-2 text-2xl font-bold ${collegeGradeEquivalent === null ? 'text-text-primary' : collegeGradeEquivalent <= 3 ? 'text-emerald-500' : 'text-red-500'}`}>
            {collegeGradeEquivalent === null
              ? '—'
              : collegeGradeEquivalent.toFixed(2)}
          </p>

          <p className="mt-2 text-xs text-text-secondary">
            {collegeGradeEquivalent === null
              ? 'Enter scores to calculate'
              : collegeGradeEquivalent <= 3
              ? 'Passing college grade'
              : 'Failing college grade'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Earned points
          </p>

          <p className="mt-2 text-2xl font-bold text-accent">
            {formatGrade(earnedWeightedGrade)}
          </p>

          <p className="mt-2 text-xs text-text-secondary">
            Out of {totalCategoryWeight} weighted points
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Completed weight
          </p>

          <p className="mt-2 text-2xl font-bold text-text-primary">
            {formatGrade(completedWeight)}%
          </p>

          <p className="mt-2 text-xs text-text-secondary">
            {formatGrade(remainingWeight)}% remaining
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Required average
          </p>

          <p className="mt-2 text-2xl font-bold text-text-primary">
            {requiredRemainingAverage === null
              ? '—'
              : `${formatGrade(
                  Math.max(0, requiredRemainingAverage)
                )}%`}
          </p>

          <p className="mt-2 text-xs text-text-secondary">
            Needed on remaining requirements
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />

            <div>
              <p className="text-sm font-semibold text-text-primary">
                Target grade
              </p>

              <p className="text-xs text-text-secondary">
                Set the final grade you want to reach.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={targetGrade}
              onChange={(event) =>
                setTargetGrade(event.target.value)
              }
              className="h-10 w-24 rounded-xl border border-border bg-bg-muted px-3 text-right text-sm font-semibold text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />

            <span className="text-sm font-medium text-text-secondary">
              %
            </span>
          </div>
        </div>

        {requiredRemainingAverage !== null && (
          <div className="mt-4">
            {requiredRemainingAverage <= 100 ? (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                <p className="text-sm leading-5 text-text-secondary">
                  You need an average of{' '}
                  <strong className="text-emerald-500">
                    {formatGrade(
                      Math.max(
                        0,
                        requiredRemainingAverage
                      )
                    )}
                    %
                  </strong>{' '}
                  on the remaining requirements to reach your
                  target.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                <p className="text-sm leading-5 text-text-secondary">
                  The current target requires more than 100%
                  on the remaining requirements. Try setting a
                  more achievable target.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {categoryResults.map((category, categoryIndex) => (
            <motion.article
              key={category.id}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 8,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -6,
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.18,
                delay: reduceMotion
                  ? 0
                  : categoryIndex * 0.025,
              }}
              className="overflow-hidden rounded-2xl border border-border bg-bg-surface"
            >
              <div className="flex flex-col gap-3 border-b border-border bg-bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-text-primary">
                      {category.title}
                    </h4>

                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                      {category.percentage}%
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-text-secondary">
                    {category.hasGrade
                      ? `${formatGrade(category.rawPercentage)}% raw · ${formatGrade(category.average)}% transmuted`
                      : 'No scores entered yet'}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-text-secondary">
                    Grade contribution
                  </p>

                  <p className="font-semibold text-text-primary">
                    {formatGrade(category.contribution)} /{' '}
                    {category.percentage}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {category.assessments.map(
                  (assessment, assessmentIndex) => {
                    const score = Number(assessment.score);
                    const maximum = Number(
                      assessment.maxScore
                    );

                    const scoreIsTooHigh =
                      assessment.score !== '' &&
                      assessment.maxScore !== '' &&
                      maximum > 0 &&
                      score > maximum;

                    return (
                      <div
                        key={assessment.id}
                        className="rounded-xl border border-border bg-bg-primary/40 p-3"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_40px] sm:items-end">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                              Assessment
                            </label>

                            <input
                              type="text"
                              value={assessment.name}
                              onChange={(event) =>
                                updateAssessment(
                                  category.id,
                                  assessment.id,
                                  'name',
                                  event.target.value
                                )
                              }
                              placeholder={category.title}
                              className="h-10 w-full rounded-xl border border-border bg-bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                              Your score
                            </label>

                            <input
                              type="text"
                              inputMode="decimal"
                              value={assessment.score}
                              onChange={(event) =>
                                updateAssessment(
                                  category.id,
                                  assessment.id,
                                  'score',
                                  event.target.value
                                )
                              }
                              placeholder="0"
                              className="h-10 w-full rounded-xl border border-border bg-bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                              Maximum
                            </label>

                            <input
                              type="text"
                              inputMode="decimal"
                              value={assessment.maxScore}
                              onChange={(event) =>
                                updateAssessment(
                                  category.id,
                                  assessment.id,
                                  'maxScore',
                                  event.target.value
                                )
                              }
                              placeholder="100"
                              className="h-10 w-full rounded-xl border border-border bg-bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteAssessment(
                                category.id,
                                assessment.id
                              )
                            }
                            aria-label="Delete assessment"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {scoreIsTooHigh && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                            <Info className="h-3.5 w-3.5" />
                            Your score is higher than the
                            maximum score.
                          </p>
                        )}
                      </div>
                    );
                  }
                )}

                <button
                  type="button"
                  onClick={() =>
                    addAssessment(category.id)
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-accent transition hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Plus className="h-4 w-4" />
                  Add assessment
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-bg-muted/50 p-4">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-accent" />

        <p className="text-xs leading-5 text-text-secondary">
          Your scores are automatically saved in this
          browser. They are stored separately for every
          subject and logged-in user.
        </p>
      </div>
    </section>
  );
}
