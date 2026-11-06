import type { Project } from './models';

export interface CreateProjectInput {
  id: string;
  name: string;
  now: string;
}

export function createProject(input: CreateProjectInput): Project {
  return {
    id: input.id,
    name: input.name,
    createdAt: input.now,
    updatedAt: input.now,
    reportIds: [],
    selectedGroupName: null,
    dateRange: {
      start: null,
      end: null,
    },
  };
}

