// ─────────────────────────────────────────────────────────────────────────────
// tasks.js  —  Shared task bucketing (single source of truth)
// Used by both the Tasks page and the Dashboard "Today's Agenda" so the two
// surfaces can never disagree about what is overdue / due today / due soon.
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Normalizes a date to local midnight to avoid timezone off-by-one errors. */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolves a task into exactly one bucket.
 * Order of resolution:
 *   1. Completed tasks (by `done` flag).
 *   2. Explicit "overdue" free-text labels (legacy/demo data).
 *   3. Parseable due dates, compared at local-day granularity:
 *        overdue  → due before today
 *        today    → due today
 *        thisWeek → due within the next 7 days
 *        upcoming → everything later
 *   4. Free-text "today"/"all day" demo labels.
 *   5. Unscheduled → no due date at all (never silently treated as "today").
 *
 * @returns {'overdue'|'today'|'thisWeek'|'upcoming'|'unscheduled'|'completed'}
 */
function getTaskCategory(task, now = new Date()) {
  if (!task) return 'unscheduled';
  if (task.done) return 'completed';

  const rawDue = task.dueDate || task.due;
  if (rawDue == null || rawDue === '') return 'unscheduled';

  const dueStr = String(rawDue).toLowerCase();
  if (dueStr.includes('overdue')) return 'overdue';

  const dueDateObj = new Date(rawDue);
  if (!Number.isNaN(dueDateObj.getTime())) {
    const today = startOfDay(now);
    const dueDay = startOfDay(dueDateObj);
    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY);

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'thisWeek';
    return 'upcoming';
  }

  // Non-parseable demo/free-text labels
  if (dueStr.includes('today') || dueStr.includes('all day')) return 'today';
  return 'unscheduled';
}

/**
 * Groups a list of tasks into the canonical buckets.
 * @returns {{overdue: Array, today: Array, thisWeek: Array, upcoming: Array, unscheduled: Array, completed: Array}}
 */
export function bucketTasks(tasks = [], now = new Date()) {
  const buckets = {
    overdue: [],
    today: [],
    thisWeek: [],
    upcoming: [],
    unscheduled: [],
    completed: [],
  };

  for (const task of tasks) {
    const category = getTaskCategory(task, now);
    (buckets[category] || buckets.unscheduled).push(task);
  }

  return buckets;
}
