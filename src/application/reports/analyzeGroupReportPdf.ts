import { summarizeRoomOccupancy, findRoomConflicts } from '../../domain/reports/roomOccupancy';
import type { DailyGroupSnapshot } from '../../domain/reports/models';
import type { RoomConflict, RoomOccupancySummary } from '../../domain/reports/roomOccupancy';
import { parseGroupReport } from '../../infrastructure/pdf/parseGroupReport';
import { extractPdfTextPages } from '../../infrastructure/pdf/pdfTextExtractor';

export interface AnalyzedGroup extends DailyGroupSnapshot {
  occupancy: RoomOccupancySummary;
  conflicts: RoomConflict[];
}

export interface AnalyzedGroupReport {
  reportDate: string;
  groups: AnalyzedGroup[];
}

export async function analyzeGroupReportPdf(data: ArrayBuffer): Promise<AnalyzedGroupReport> {
  const pages = await extractPdfTextPages(data);
  const parsedReport = parseGroupReport(pages);

  return {
    reportDate: parsedReport.reportDate,
    groups: parsedReport.groups.map((group) => ({
      ...group,
      occupancy: summarizeRoomOccupancy(group.rooms),
      conflicts: findRoomConflicts(group.rooms),
    })),
  };
}
