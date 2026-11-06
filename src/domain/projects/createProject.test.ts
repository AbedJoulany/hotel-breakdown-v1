import { describe, expect, it } from 'vitest';
import { createProject } from './createProject';

describe('createProject', () => {
  it('creates an empty project with deterministic initial state', () => {
    expect(createProject({
      id: 'project-1',
      name: 'October Group',
      now: '2026-11-06T12:00:00.000Z',
    })).toEqual({
      id: 'project-1',
      name: 'October Group',
      createdAt: '2026-11-06T12:00:00.000Z',
      updatedAt: '2026-11-06T12:00:00.000Z',
      reportIds: [],
      selectedGroupName: null,
      dateRange: {
        start: null,
        end: null,
      },
    });
  });
});
