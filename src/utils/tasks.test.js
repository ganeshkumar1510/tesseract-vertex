import { describe, it, expect } from 'vitest';
import { bucketTasks } from './tasks';

describe('bucketTasks', () => {
  const baseDate = new Date('2026-11-05T12:00:00Z');

  it('puts completed tasks in completed bucket', () => {
    const tasks = [
      { id: '1', title: 'Task 1', done: true },
      { id: '2', title: 'Task 2', done: false, due: '2026-11-05' },
    ];
    const buckets = bucketTasks(tasks, baseDate);
    expect(buckets.completed).toHaveLength(1);
    expect(buckets.completed[0].id).toBe('1');
    expect(buckets.today).toHaveLength(1);
  });

  it('buckets overdue, today, thisWeek, and upcoming based on date comparison', () => {
    const tasks = [
      { id: 't_past', title: 'Past task', done: false, due: '2026-11-01' },
      { id: 't_today', title: 'Today task', done: false, due: '2026-11-05' },
      { id: 't_soon', title: 'Soon task', done: false, due: '2026-11-08' },
      { id: 't_future', title: 'Future task', done: false, due: '2026-11-25' },
      { id: 't_nodate', title: 'Unscheduled task', done: false },
    ];

    const buckets = bucketTasks(tasks, baseDate);
    expect(buckets.overdue.map(t => t.id)).toEqual(['t_past']);
    expect(buckets.today.map(t => t.id)).toEqual(['t_today']);
    expect(buckets.thisWeek.map(t => t.id)).toEqual(['t_soon']);
    expect(buckets.upcoming.map(t => t.id)).toEqual(['t_future']);
    expect(buckets.unscheduled.map(t => t.id)).toEqual(['t_nodate']);
  });

  it('handles free-text overdue and today labels', () => {
    const tasks = [
      { id: '1', title: 'Overdue task', done: false, due: 'overdue' },
      { id: '2', title: 'Today text task', done: false, due: 'Today, 2:00 PM' },
    ];
    const buckets = bucketTasks(tasks, baseDate);
    expect(buckets.overdue).toHaveLength(1);
    expect(buckets.today).toHaveLength(1);
  });
});

