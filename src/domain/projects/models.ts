import type { Id, IsoDate } from '../shared/types';

export interface Project {
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  reportIds: Id[];
  selectedGroupName: string | null;
  /** Optional user-facing/export metadata; source report facts remain authoritative for calculations. */
  hotelName?: string;
  pm?: string;
  groupNameOverride?: string;
  reportDateOverride?: IsoDate | null;
  dateRange: {
    start: IsoDate | null;
    end: IsoDate | null;
  };
}
