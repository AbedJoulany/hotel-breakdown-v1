import type { Id, IsoDate } from '../shared/types';

export interface Project {
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  reportIds: Id[];
  selectedGroupName: string | null;
  dateRange: {
    start: IsoDate | null;
    end: IsoDate | null;
  };
}
