import { useEffect, useMemo, useState } from 'react';
import { analyzeGroupReportPdf } from './application/reports/analyzeGroupReportPdf';
import type { AnalyzedGroupReport } from './application/reports/analyzeGroupReportPdf';
import { createProject } from './domain/projects/createProject';
import type { Project } from './domain/projects/models';
import { replaceReportForDate } from './domain/reports/replaceReport';
import type { ActiveReportDocument } from './domain/reports/models';
import type { RoomRecord } from './domain/reports/models';
import { findMissingReportDates, summarizeReportCoverage } from './domain/reports/reportCoverage';
import { calculateGroupRoomNights } from './domain/reports/roomNights';
import { groupMatchKey } from './domain/reports/groupMatch';
import type { ConflictField } from './domain/reports/roomOccupancy';
import { applyRoomCorrections, type RoomCorrection } from './domain/reports/roomCorrections';
import { matchPricingRule, type PricingRule } from './domain/pricing/pricingRules';
import { calculateFinancialSummary } from './domain/pricing/financialSummary';
import { validateFinancialSummary } from './domain/pricing/financialValidation';
import PricingRulesPanel from './components/PricingRulesPanel';
import FolioComparisonPanel from './components/FolioComparisonPanel';
import type { GroupRoomForFolioComparison } from './domain/folio/models';
import type { FolioStayComparisonResult } from './domain/folio/models';
import { hashArrayBuffer } from './infrastructure/files/hashArrayBuffer';
import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from './infrastructure/storage/workspaceStore';
import type { FolioWarningAcknowledgement } from './infrastructure/storage/workspaceStore';
import ExportPreview from './components/ExportPreview';
import { buildExportData, applyRateOverrides } from './application/export/buildExportData';
import { validateExport } from './domain/export/exportValidation';
import type { ExportLanguage } from './domain/export/models';
import { buildHebrewWorkbook, buildUsdWorkbook, downloadWorkbook } from './infrastructure/export/excelBuilders';
import AdditionalChargesPanel from './components/AdditionalChargesPanel';
import { createAdditionalChargeRow, type AdditionalChargeRow } from './domain/charges/models';
import ComplimentaryStaffPanel from './components/ComplimentaryStaffPanel';
import { createComplimentaryStaffRow, type ComplimentaryStaffRow } from './domain/charges/complimentaryStaffModels';
import { applyRecoveryAdjustments, type RecoveryAdjustment } from './domain/reports/recoveryAdjustments';
import RecoveryReviewPanel, { type RecoveryCandidate } from './components/RecoveryReviewPanel';
import type { IsoDate } from './domain/shared/types';

type View = 'home' | 'workspace' | 'folio' | 'complimentary-staff' | 'additional-charges' | 'export';
type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

type DateRangeField = 'start' | 'end';

function defaultHotelName(language: ExportLanguage): string {
  return language === 'hebrew' ? 'אוריינט' : 'orient hotel';
}

function parseDateInput(value: string): Project['dateRange']['start'] | null {
  const normalized = value.trim().replace(/[/.]/g, '-');
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(normalized);
  const europeanMatch = /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/u.exec(normalized);
  const year = isoMatch ? Number(isoMatch[1]) : europeanMatch ? Number(europeanMatch[3]) : null;
  const month = isoMatch ? Number(isoMatch[2]) : europeanMatch ? Number(europeanMatch[2]) : null;
  const day = isoMatch ? Number(isoMatch[3]) : europeanMatch ? Number(europeanMatch[1]) : null;
  if (year === null || month === null || day === null) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  const candidate = new Date(Date.UTC(fullYear, month - 1, day));
  if (candidate.getUTCFullYear() !== fullYear || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` as Project['dateRange']['start'];
}

function App() {
  const [view, setView] = useState<View>('home');
  const [analysis, setAnalysis] = useState<AnalyzedGroupReport | null>(null);
  const [analyses, setAnalyses] = useState<AnalyzedGroupReport[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<ActiveReportDocument[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [dateRangeEdited, setDateRangeEdited] = useState(false);
  const [dateInputValues, setDateInputValues] = useState({ start: '', end: '' });
  const [roomNightSummaryExpanded, setRoomNightSummaryExpanded] = useState(true);
  const [corrections, setCorrections] = useState<RoomCorrection[]>([]);
  const [correctionHistory, setCorrectionHistory] = useState<RoomCorrection[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeRow[]>([createAdditionalChargeRow('additional-charge-1')]);
  const [complimentaryStaff, setComplimentaryStaff] = useState<ComplimentaryStaffRow[]>([createComplimentaryStaffRow('complimentary-staff-1')]);
  const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('hebrew');
  const [rateOverrides, setRateOverrides] = useState<Map<string, string>>(new Map());
  const [folioWarningAcknowledgement, setFolioWarningAcknowledgement] = useState<FolioWarningAcknowledgement | null>(null);
  const [folioComparisonComplete, setFolioComparisonComplete] = useState(false);
  const [folioComparisonResults, setFolioComparisonResults] = useState<FolioStayComparisonResult[]>([]);
  const [recoveryAdjustments, setRecoveryAdjustments] = useState<RecoveryAdjustment[]>([]);
  useEffect(() => {
    setDateInputValues({
      start: project?.dateRange.start ?? '',
      end: project?.dateRange.end ?? '',
    });
  }, [project?.dateRange.start, project?.dateRange.end]);
  const coverage = summarizeReportCoverage(reports);
  const selectedRangeInvalid = Boolean(
    project?.dateRange.start && project.dateRange.end && project.dateRange.start > project.dateRange.end,
  );
  const selectedRangeMissingDates = project?.dateRange.start && project.dateRange.end && !selectedRangeInvalid
    ? findMissingReportDates(
      reports.map((report) => report.reportDate),
      project.dateRange.start,
      project.dateRange.end,
    )
    : [];
  const visibleAnalyses = analyses.filter((report) => {
    if (selectedRangeInvalid) return true;
    const start = project?.dateRange.start;
    const end = project?.dateRange.end;
    return (!start || report.reportDate >= start) && (!end || report.reportDate <= end);
  });
  const correctedReports = reports.map((report) => ({
    ...report,
    groupSnapshots: report.groupSnapshots.map((group) => ({
      ...group,
      rooms: applyRoomCorrections(
        group.rooms,
        corrections.filter((correction) => correction.reportId === group.reportId),
      ),
    })),
  }));
  const effectiveReports = useMemo(
    () => applyRecoveryAdjustments(correctedReports, recoveryAdjustments),
    [reports, corrections, recoveryAdjustments],
  );
  const roomNightSummary = project?.selectedGroupName
    ? calculateGroupRoomNights(effectiveReports, project.selectedGroupName)
    : null;
  const selectedPricingDays = project?.selectedGroupName
    ? effectiveReports.flatMap((report) => report.groupSnapshots
      .filter((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? ''))
      .map((group) => ({
        reportDate: report.reportDate as `${number}-${number}-${number}`,
        rooms: group.rooms,
      })))
    : [];
  const financialSummary = project?.selectedGroupName
    ? calculateFinancialSummary(selectedPricingDays, pricingRules, recoveryAdjustments)
    : null;
  const financialValidation = financialSummary ? validateFinancialSummary(financialSummary) : null;
  const invalidDateInputs = (['start', 'end'] as const).filter((field) => dateInputValues[field].trim() !== '' && !parseDateInput(dateInputValues[field]));
  const baseExportModel = useMemo(() => project?.selectedGroupName
    ? buildExportData({
      reports: effectiveReports,
      selectedGroupName: project.selectedGroupName,
      corrections: [],
      pricingRules,
      additionalCharges,
      complimentaryStaff,
      recoveryAdjustments,
      exportMetadata: {
        hotelName: project.hotelName,
        pm: project.pm,
        groupName: project.groupNameOverride,
        reportDate: project.reportDateOverride,
      },
    })
    : null, [effectiveReports, project?.selectedGroupName, project?.hotelName, project?.pm, project?.groupNameOverride, project?.reportDateOverride, corrections, pricingRules, additionalCharges, complimentaryStaff, recoveryAdjustments]);
  const exportModel = useMemo(() => baseExportModel ? applyRateOverrides(baseExportModel, rateOverrides) : null, [baseExportModel, rateOverrides]);
  const selectedFolioGroupRooms = useMemo<GroupRoomForFolioComparison[]>(() => project?.selectedGroupName
    ? effectiveReports.flatMap((report) => report.groupSnapshots
      .filter((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? ''))
      .flatMap((group) => group.rooms.map((room) => ({
        reportDate: report.reportDate as GroupRoomForFolioComparison['reportDate'],
        roomNumber: room.roomNumber,
        guestName: room.guestName,
        reportedRate: room.reportedRate,
        fromDate: room.fromDate,
        toDate: room.toDate,
      }))))
    : [], [effectiveReports, project?.selectedGroupName, corrections]);
  const recoveryCandidates = useMemo<RecoveryCandidate[]>(() => {
    if (!project?.selectedGroupName) return [];
    const targetDates = [...new Set(folioComparisonResults.flatMap((result) => result.missingGroupReportDates ?? []))].sort();
    return targetDates.map((targetDate) => {
      const sourceReport = [...correctedReports]
        .filter((report) => report.reportDate < targetDate)
        .sort((left, right) => right.reportDate.localeCompare(left.reportDate))
        .find((report) => report.groupSnapshots.some((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? '')));
      const sourceGroup = sourceReport?.groupSnapshots.find((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? ''));
      const targetReport = effectiveReports.find((report) => report.reportDate === targetDate);
      const targetGroup = targetReport?.groupSnapshots.find((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? ''));
      const existingRooms = new Set(targetGroup?.rooms.map((room) => room.roomNumber) ?? []);
      const rooms = [...new Map((sourceGroup?.rooms ?? [])
        .filter((room) => !existingRooms.has(room.roomNumber))
        .map((room) => [room.roomNumber, room])).values()];
      return { targetDate, sourceDate: sourceReport?.reportDate ?? null, rooms };
    });
  }, [folioComparisonResults, correctedReports, effectiveReports, project?.selectedGroupName]);
  useEffect(() => {
    if (!project) {
      return;
    }

    void saveWorkspaceSnapshot({ project, reports, analyses, analysis, corrections, correctionHistory, pricingRules, additionalCharges, complimentaryStaff, folioWarningAcknowledgement, recoveryAdjustments })
      .catch(() => setError('Could not save the workspace locally.'));
  }, [analysis, analyses, project, reports, corrections, correctionHistory, pricingRules, additionalCharges, complimentaryStaff, folioWarningAcknowledgement, recoveryAdjustments]);

  useEffect(() => {
    if (!baseExportModel) return;
    const validIds = new Set(baseExportModel.nights.flatMap((night) => night.roomCharges.map((row) => row.groupedRowId)));
    setRateOverrides((current) => {
      const next = new Map([...current].filter(([id]) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [baseExportModel]);
  function updateReportState(
    nextReports: ActiveReportDocument[],
    nextAnalyses: AnalyzedGroupReport[],
    nextAnalysis: AnalyzedGroupReport | null,
  ) {
    const nextCoverage = summarizeReportCoverage(nextReports);
    setReports(nextReports);
    setAnalysis(nextAnalysis);
    setAnalyses(nextAnalyses);
    setProject((current) => current ? {
      ...current,
      reportIds: nextReports.map((report) => report.id),
      dateRange: nextCoverage && !dateRangeEdited
        ? { start: nextCoverage.start, end: nextCoverage.end }
        : current.dateRange,
      updatedAt: new Date().toISOString(),
    } : current);
  }

  async function processReportFile(
    file: File,
    currentReports: ActiveReportDocument[],
    currentAnalyses: AnalyzedGroupReport[],
    currentAnalysis: AnalyzedGroupReport | null,
  ) {
    const data = await file.arrayBuffer();
    const parsed = await analyzeGroupReportPdf(data);
    const candidate: ActiveReportDocument & { isValid: boolean } = {
      id: `report-${Date.now()}-${file.name}`,
      reportDate: parsed.reportDate as ActiveReportDocument['reportDate'],
      originalFileName: file.name,
      contentHash: await hashArrayBuffer(data),
      groupSnapshots: parsed.groups.map(({ occupancy: _occupancy, conflicts: _conflicts, ...group }) => group),
      isValid: true,
    };
    const result = replaceReportForDate(currentReports, candidate);
    const nextAnalyses = result.kind === 'ignored-duplicate'
      ? currentAnalyses
      : [
        ...currentAnalyses.filter((report) => report.reportDate !== parsed.reportDate),
        parsed,
      ].sort((left, right) => left.reportDate.localeCompare(right.reportDate));

    return {
      kind: result.kind,
      reports: result.reports,
      analyses: nextAnalyses,
      analysis: result.kind === 'ignored-duplicate' ? currentAnalysis : parsed,
    };
  }

  async function handleExcelExport(final: boolean) {
    if (!exportModel) return;
    const validation = validateExport(exportModel, exportLanguage, folioComparisonComplete);
    if ((final && !validation.canFinal) || (!final && !validation.canDraft)) {
      setError('Complete Folio Comparison before exporting.');
      return;
    }
    const workbook = exportLanguage === 'hebrew'
      ? await buildHebrewWorkbook(exportModel)
      : await buildUsdWorkbook(exportModel, exportLanguage === 'english-ils' ? 'ILS' : 'USD');
    const suffix = final ? 'final' : 'draft';
    await downloadWorkbook(workbook, `hotel-breakdown-${suffix}-${exportLanguage}.xlsx`);
  }

  async function handleReportUpload(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) {
      return;
    }

    const batchId = Date.now();
    const items = files.map((file, index) => ({
      id: `upload-${batchId}-${index}-${file.name}`,
      file,
      status: 'pending' as const,
    }));
    setFileName(files.map((file) => file.name).join(', '));
    setUploadItems(items);
    setError(null);
    setReportMessage(null);

    let activeReports = reports;
    let latestAnalysis = analysis;
    let activeAnalyses = analyses;
    let added = 0;
    let replaced = 0;
    let duplicates = 0;
    let failed = 0;

    for (const item of items) {
      setUploadItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: 'processing', error: undefined }
        : entry));
      try {
        const result = await processReportFile(item.file, activeReports, activeAnalyses, latestAnalysis);
        activeReports = result.reports;
        activeAnalyses = result.analyses;
        latestAnalysis = result.analysis;

        if (result.kind === 'ignored-duplicate') {
          duplicates += 1;
        } else {
          if (result.kind === 'replaced') {
            replaced += 1;
          } else {
            added += 1;
          }
        }
        setUploadItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, status: 'completed' }
          : entry));
      } catch {
        failed += 1;
        setUploadItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, status: 'failed', error: 'Could not analyze this PDF.' }
          : entry));
      }
    }

    updateReportState(activeReports, activeAnalyses, latestAnalysis);
    setReportMessage(`${added} added · ${replaced} replaced · ${duplicates} duplicate`);
    if (failed > 0) {
      setError(`${failed} file(s) could not be analyzed. Other files were processed.`);
    }
  }

  async function handleRetry(itemId: string) {
    const item = uploadItems.find((entry) => entry.id === itemId);
    if (!item || item.status !== 'failed') {
      return;
    }

    setUploadItems((current) => current.map((entry) => entry.id === itemId
      ? { ...entry, status: 'processing', error: undefined }
      : entry));
    setError(null);

    try {
      const result = await processReportFile(item.file, reports, analyses, analysis);
      updateReportState(result.reports, result.analyses, result.analysis);
      setUploadItems((current) => current.map((entry) => entry.id === itemId
        ? { ...entry, status: 'completed' }
        : entry));
      setReportMessage(result.kind === 'ignored-duplicate'
        ? 'Retry completed: exact duplicate ignored.'
        : 'Retry completed: report added or replaced.');
    } catch {
      setUploadItems((current) => current.map((entry) => entry.id === itemId
        ? { ...entry, status: 'failed', error: 'Could not analyze this PDF.' }
        : entry));
      setError('Retry failed. Please verify that this PDF is a supported group report.');
    }
  }

  function handleNewProject() {
    const now = new Date().toISOString();
    setAnalysis(null);
    setAnalyses([]);
    setReports([]);
    setFileName(null);
    setUploadItems([]);
    setError(null);
    setReportMessage(null);
    setDateRangeEdited(false);
    setDateInputValues({ start: '', end: '' });
    setExportLanguage('hebrew');
    setCorrections([]);
    setCorrectionHistory([]);
    setPricingRules([]);
    setAdditionalCharges([createAdditionalChargeRow('additional-charge-1')]);
    setComplimentaryStaff([createComplimentaryStaffRow('complimentary-staff-1')]);
    setFolioWarningAcknowledgement(null);
    setFolioComparisonComplete(false);
    setFolioComparisonResults([]);
    setRecoveryAdjustments([]);
    setProject({
      ...createProject({
        id: `project-${Date.now()}`,
        name: 'Untitled Project',
        now,
      }),
      hotelName: defaultHotelName('hebrew'),
    });
    setView('workspace');
  }

  function handleExportLanguageChange(language: ExportLanguage) {
    setExportLanguage(language);
    updateProjectMetadata('hotelName', defaultHotelName(language));
  }

  function handleDateInput(field: DateRangeField, value: string) {
    setDateInputValues((current) => ({ ...current, [field]: value }));
    setDateRangeEdited(true);
    const parsed = value.trim() === '' ? null : parseDateInput(value);
    if (value.trim() !== '' && parsed === null) return;
    setProject((current) => current ? {
      ...current,
      dateRange: { ...current.dateRange, [field]: parsed },
      updatedAt: new Date().toISOString(),
    } : current);
  }

  async function handleContinueProject() {
    setView('workspace');
    setError(null);

    try {
      const snapshot = await loadWorkspaceSnapshot();
      if (!snapshot) {
        setReportMessage('No saved project was found on this device.');
        return;
      }

      setProject(snapshot.project);
      setReports(snapshot.reports);
      setAnalyses(snapshot.analyses);
      setAnalysis(snapshot.analysis ?? snapshot.analyses.at(-1) ?? null);
      setFileName(snapshot.reports.map((report) => report.originalFileName).join(', ') || null);
      setUploadItems([]);
      setCorrections(snapshot.corrections ?? []);
      setCorrectionHistory(snapshot.correctionHistory ?? []);
      setPricingRules(snapshot.pricingRules ?? []);
      setAdditionalCharges(snapshot.additionalCharges?.length ? snapshot.additionalCharges : [createAdditionalChargeRow('additional-charge-1')]);
      setComplimentaryStaff(snapshot.complimentaryStaff?.length ? snapshot.complimentaryStaff : [createComplimentaryStaffRow('complimentary-staff-1')]);
      setFolioWarningAcknowledgement(snapshot.folioWarningAcknowledgement ?? null);
      setFolioComparisonComplete(false);
      setFolioComparisonResults([]);
      setRecoveryAdjustments(snapshot.recoveryAdjustments ?? []);
      setReportMessage('Saved project restored.');
    } catch {
      setError('Could not load the saved workspace from this device.');
    }
  }

  function handleGroupSelection(groupName: string) {
    setProject((current) => current ? {
      ...current,
      selectedGroupName: groupName,
      groupNameOverride: groupName,
      updatedAt: new Date().toISOString(),
    } : current);
  }

  function updateProjectMetadata(field: 'hotelName' | 'pm' | 'groupNameOverride' | 'reportDateOverride', value: string) {
    setProject((current) => current ? {
      ...current,
      [field]: field === 'reportDateOverride' ? (value ? parseDateInput(value) : null) : value,
      updatedAt: new Date().toISOString(),
    } : current);
  }

  function createRecoveryProposal(candidate: RecoveryCandidate) {
    if (!project?.selectedGroupName || !candidate.sourceDate) return;
    const now = new Date().toISOString();
    const next = candidate.rooms.map((room, index): RecoveryAdjustment => ({
      id: `recovery-${candidate.targetDate}-${room.roomNumber}-${index}-${Date.now()}`,
      targetDate: candidate.targetDate,
      sourceDate: candidate.sourceDate as IsoDate,
      groupName: project.selectedGroupName as string,
      room: { ...room },
      proposedRate: room.reportedRate,
      approvedRate: null,
      currency: (() => {
        const result = matchPricingRule({
          reportDate: candidate.sourceDate as IsoDate,
          roomType: room.bookedRoomType ?? room.actualRoomType ?? '',
          adults: room.adults,
          children: room.children,
        }, pricingRules);
        return result.kind === 'matched' ? result.rule.currency : null;
      })(),
      included: true,
      status: 'proposed',
      origin: 'previous-night-copy',
      createdAt: now,
    }));
    setRecoveryAdjustments((current) => [...current.filter((entry) => entry.targetDate !== candidate.targetDate), ...next]);
    setError(null);
  }

  function updateRecoveryAdjustment(id: string, patch: Partial<Pick<RecoveryAdjustment, 'room' | 'proposedRate' | 'included'>>) {
    setRecoveryAdjustments((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  }

  function approveRecovery(targetDate: IsoDate) {
    const rows = recoveryAdjustments.filter((entry) => entry.targetDate === targetDate);
    const selected = rows.filter((entry) => entry.included);
    if (selected.length === 0) {
      setError('Select at least one room before approving the recovery.');
      return;
    }
    if (selected.some((entry) => entry.proposedRate === null || entry.proposedRate.trim() === '' || !Number.isFinite(Number(entry.proposedRate)) || Number(entry.proposedRate) < 0 || entry.room.rooms === null || !Number.isInteger(entry.room.rooms) || entry.room.rooms < 0)) {
      setError('Recovery rates and quantities must be valid non-negative numbers.');
      return;
    }
    const duplicateRoom = selected.some((entry, index) => selected.findIndex((candidate) => candidate.room.roomNumber === entry.room.roomNumber) !== index);
    if (duplicateRoom) {
      setError('A recovery cannot contain duplicate room/date entries.');
      return;
    }
    const targetReport = effectiveReports.find((report) => report.reportDate === targetDate);
    const currentRecoveryRooms = new Set(rows.map((entry) => entry.room.roomNumber));
    const existingRooms = new Set(targetReport?.groupSnapshots
      .find((group) => project?.selectedGroupName && groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName))
      ?.rooms.filter((room) => !currentRecoveryRooms.has(room.roomNumber)).map((room) => room.roomNumber) ?? []);
    if (selected.some((entry) => existingRooms.has(entry.room.roomNumber))) {
      setError('A selected recovery room already exists in the effective report.');
      return;
    }
    setRecoveryAdjustments((current) => current.map((entry) => entry.targetDate === targetDate
      ? { ...entry, status: 'approved', approvedRate: entry.included ? entry.proposedRate : null }
      : entry));
    setError(null);
  }

  function cancelRecovery(targetDate: IsoDate) {
    const rows = recoveryAdjustments.filter((entry) => entry.targetDate === targetDate);
    if (rows.some((entry) => entry.approvedRate !== null)) {
      setRecoveryAdjustments((current) => current.map((entry) => entry.targetDate === targetDate
        ? { ...entry, status: 'approved', proposedRate: entry.approvedRate, included: entry.approvedRate !== null }
        : entry));
    } else {
      setRecoveryAdjustments((current) => current.filter((entry) => entry.targetDate !== targetDate));
    }
    setError(null);
  }

  function editRecovery(targetDate: IsoDate) {
    setRecoveryAdjustments((current) => current.map((entry) => entry.targetDate === targetDate
      ? { ...entry, status: 'proposed', proposedRate: entry.approvedRate ?? entry.proposedRate, included: entry.approvedRate !== null }
      : entry));
  }

  function removeRecovery(targetDate: IsoDate) {
    setRecoveryAdjustments((current) => current.filter((entry) => entry.targetDate !== targetDate));
    setError(null);
  }

  function handleRoomCorrection(
    report: AnalyzedGroupReport,
    group: AnalyzedGroupReport['groups'][number],
    conflict: AnalyzedGroupReport['groups'][number]['conflicts'][number],
    selectedRecordIndex: number,
  ) {
    const correction: RoomCorrection = {
      id: `correction-${Date.now()}-${group.reportId}-${conflict.roomNumber}`,
      reportId: group.reportId,
      reportDate: report.reportDate as RoomCorrection['reportDate'],
      groupName: group.groupName,
      roomNumber: conflict.roomNumber,
      selectedRecordIndex,
      reason: null,
      correctedAt: new Date().toISOString(),
    };
    setCorrections((current) => [
      ...current.filter((entry) => entry.reportId !== correction.reportId || entry.roomNumber !== correction.roomNumber),
      correction,
    ]);
    setCorrectionHistory((current) => [...current, correction]);
  }

  if (view !== 'home') {
    return (
      <main className="app-shell">
        <section
          className="workspace-card"
          aria-labelledby={view === 'workspace' ? 'workspace-title' : view === 'export' ? 'export-preview-title' : `${view}-screen-title`}
        >
          <nav className="screen-navigation" aria-label="Project screens">
            <button
              className={`text-button${view === 'workspace' ? ' active' : ''}`}
              type="button"
              aria-current={view === 'workspace' ? 'page' : undefined}
              onClick={() => setView('workspace')}
            >
              Workspace
            </button>
            <button
              className={`text-button${view === 'folio' ? ' active' : ''}`}
              type="button"
              aria-current={view === 'folio' ? 'page' : undefined}
              onClick={() => setView('folio')}
            >
              Folio Comparison
            </button>
            <button
              className={`text-button${view === 'complimentary-staff' ? ' active' : ''}`}
              type="button"
              aria-current={view === 'complimentary-staff' ? 'page' : undefined}
              onClick={() => setView('complimentary-staff')}
            >
              Complimentary &amp; Staff
            </button>
            <button
              className={`text-button${view === 'additional-charges' ? ' active' : ''}`}
              type="button"
              aria-current={view === 'additional-charges' ? 'page' : undefined}
              onClick={() => setView('additional-charges')}
            >
              Additional Charges
            </button>
            <button
              className={`text-button${view === 'export' ? ' active' : ''}`}
              type="button"
              aria-current={view === 'export' ? 'page' : undefined}
              onClick={() => setView('export')}
            >
              Excel Export
            </button>
          </nav>
          <div className="workspace-content" hidden={view !== 'workspace'}>
            <p className="eyebrow">Hotel Breakdown V1</p>
            <h1 id="workspace-title">Project workspace</h1>
            {project && <p className="project-name">Project: {project.name}</p>}
            <p className="muted">Upload a daily group report to inspect its detected groups.</p>
          <label className="upload-box group-report-upload-box">
            <span className="upload-box-title">Upload Group Reports</span>
            <span className="upload-box-hint">Select one or more daily PDF reports. Reports are processed locally.</span>
            <input
              aria-label="Group report PDF"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(event) => void handleReportUpload(event.target.files)}
            />
          </label>
          {fileName && <p className="file-name" aria-live="polite">Selected files: {fileName}</p>}
          {uploadItems.length > 0 && (
            <section className="upload-status" aria-labelledby="upload-status-title">
              <h2 id="upload-status-title">File processing</h2>
              <ul className="upload-status-list">
                {uploadItems.map((item) => (
                  <li key={item.id} className={`upload-status-row ${item.status}`}>
                    <div>
                      <strong>{item.file.name}</strong>
                      {item.error && <span className="error-message">{item.error}</span>}
                    </div>
                    <div className="upload-status-actions">
                      <span className="upload-status-label">{item.status}</span>
                      {item.status === 'failed' && (
                        <button
                          className="retry-button"
                          onClick={() => void handleRetry(item.id)}
                        >
                          Retry {item.file.name}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {reportMessage && <p className="report-message">{reportMessage}</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          {analysis && (
            <section className="analysis-result" aria-labelledby="analysis-title">
              <div className="analysis-heading">
                <div>
                  <p className="eyebrow">Analysis result</p>
                <h2 id="analysis-title">Report date: {analysis.reportDate}</h2>
                </div>
                <span className="group-count">{analysis.groups.length} groups · {reports.length} active report(s)</span>
              </div>
              {coverage && (
                <div className="coverage-summary">
                  <span>Coverage: {coverage.start} to {coverage.end}</span>
                </div>
              )}
              {project && (
                <div className="date-range-controls">
                  <label>
                    Start date
                    <input
                      type="date"
                      value={dateInputValues.start}
                      onChange={(event) => handleDateInput('start', event.target.value)}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={dateInputValues.end}
                      onChange={(event) => handleDateInput('end', event.target.value)}
                    />
                  </label>
                </div>
              )}
              {invalidDateInputs.length > 0 && (
                <p className="warning-text" role="alert">Enter a valid date as YYYY-MM-DD or DD.MM.YYYY.</p>
              )}
              {selectedRangeInvalid && (
                <p className="warning-text" role="alert">Start date must not be after end date.</p>
              )}
              {!selectedRangeInvalid && selectedRangeMissingDates.length > 0 && (
                <p className="warning-text" role="alert">
                  Missing report date(s) in selected range: {selectedRangeMissingDates.join(', ')}
                </p>
              )}
              {visibleAnalyses.map((report) => (
                <section className="report-groups" key={report.reportDate} aria-labelledby={`report-groups-${report.reportDate}`}>
                  <h3 id={`report-groups-${report.reportDate}`}>Groups for {report.reportDate}</h3>
                  <div className="group-list">
                    {report.groups.map((group) => (
                      <button
                        className={`group-row${project?.selectedGroupName && groupMatchKey(project.selectedGroupName) === groupMatchKey(group.groupName) ? ' selected' : ''}`}
                        key={`${report.reportDate}-${group.groupName}-${group.reportId}`}
                        aria-label={`Select group ${group.groupName} on ${report.reportDate}`}
                        aria-pressed={Boolean(project?.selectedGroupName && groupMatchKey(project.selectedGroupName) === groupMatchKey(group.groupName))}
                        onClick={() => handleGroupSelection(group.groupName)}
                      >
                        <div>
                          <strong>{group.groupName}</strong>
                          {group.conflicts.length > 0 && (
                            <span className="warning-text">Review {group.conflicts.length} conflict(s)</span>
                          )}
                        </div>
                        <span>{group.occupancy.occupiedRoomCount} rooms</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {project?.selectedGroupName && (
                <p className="selected-group">Selected group: {project.selectedGroupName}</p>
              )}
              <PricingRulesPanel
                analyses={analyses}
                selectedGroupName={project?.selectedGroupName ?? null}
                rules={pricingRules}
                onRulesChange={setPricingRules}
              />
              {roomNightSummary && (
                <section className="room-night-summary" aria-labelledby="room-night-title">
                  <div className="room-night-summary-header">
                    <h3 id="room-night-title">Room-Nights: {roomNightSummary.totalRoomNights}</h3>
                    <button
                      className="text-button"
                      type="button"
                      aria-expanded={roomNightSummaryExpanded}
                      aria-controls="room-night-summary-details"
                      onClick={() => setRoomNightSummaryExpanded((current) => !current)}
                    >
                      {roomNightSummaryExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {roomNightSummaryExpanded && <div id="room-night-summary-details">
                  <div className="daily-room-nights">
                    {roomNightSummary.days.map((day) => (
                      <span key={day.reportDate}>
                        {day.reportDate}: {day.roomNights} room(s)
                      </span>
                    ))}
                  </div>
                  <div className="room-detail-list">
                    <div className="room-detail-header" aria-hidden="true">
                      <span>Room / Guest</span>
                      <span>Booked Room Type</span>
                      <span>Actual Room Type</span>
                      <span>Occupancy</span>
                      <span>Reported Price</span>
                      <span>Pricing</span>
                    </div>
                    <strong>Selected group rooms</strong>
                    {analyses.map((report) => report.groups
                      .filter((group) => project?.selectedGroupName && groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName))
                      .map((group) => group.rooms.length > 0 && (
                        <div key={`${report.reportDate}-${group.groupName}-rooms`}>
                          <strong>{report.reportDate}</strong>
                          {applyRoomCorrections(
                            group.rooms,
                            corrections.filter((correction) => correction.reportId === group.reportId),
                          ).map((room, index) => (
                            <div className="room-detail-row" key={`${room.roomNumber}-${index}`}>
                              <span>{room.roomNumber} · {room.guestName}</span>
                              <span>{room.bookedRoomType ?? room.actualRoomType ?? '—'}</span>
                              <span>{room.actualRoomType ?? '—'}</span>
                              <span>{room.adults ?? '—'}/{room.children ?? '—'}</span>
                              <span>{room.reportedRate ?? '—'}</span>
                              <span className={`pricing-status ${getPricingResultKind(room, report.reportDate, pricingRules)}`}>
                                {formatPricingResult(room, report.reportDate, pricingRules)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )))}
                  </div>
                  {analyses.map((report) => report.groups
                    .filter((group) => project?.selectedGroupName && groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName))
                    .map((group) => group.conflicts.length > 0 && (
                      <div className="conflict-detail-list" key={`${report.reportDate}-${group.groupName}-conflicts`}>
                        <strong>Room conflicts · {report.reportDate}</strong>
                        {group.conflicts.map((conflict) => (
                          <article className="conflict-detail" key={`${conflict.roomNumber}-${conflict.recordIndexes.join('-')}`}>
                            <strong>Room {conflict.roomNumber}</strong>
                            <span>Different fields: {conflict.conflictingFields.map(formatConflictField).join(', ')}</span>
                            <ul>
                              {conflict.recordIndexes.map((recordIndex) => {
                                const room = group.rooms[recordIndex];
                                const selected = corrections.some((correction) => correction.reportId === group.reportId
                                  && correction.roomNumber === conflict.roomNumber
                                  && correction.selectedRecordIndex === recordIndex);
                                return room ? (
                                  <li key={`${conflict.roomNumber}-${recordIndex}`}>
                                    Record {recordIndex + 1} · {room.guestName || 'Unnamed guest'} · {conflict.conflictingFields
                                      .map((field) => `${formatConflictField(field)}: ${formatConflictValue(room[field])}`)
                                      .join(' · ')}
                                    <button
                                      className={`correction-button${selected ? ' selected' : ''}`}
                                      type="button"
                                      onClick={() => handleRoomCorrection(report, group, conflict, recordIndex)}
                                    >
                                      {selected ? 'Selected record' : `Use record ${recordIndex + 1}`}
                                    </button>
                                  </li>
                                ) : null;
                              })}
                            </ul>
                            {corrections.some((correction) => correction.reportId === group.reportId
                              && correction.roomNumber === conflict.roomNumber) && (
                              <span className="correction-status">This record is used in the derived summary.</span>
                            )}
                            {correctionHistory.some((entry) => entry.reportId === group.reportId
                              && entry.roomNumber === conflict.roomNumber) && (
                              <ul className="correction-history" aria-label={`Correction history for room ${conflict.roomNumber}`}>
                                {correctionHistory
                                  .filter((entry) => entry.reportId === group.reportId && entry.roomNumber === conflict.roomNumber)
                                  .map((entry) => (
                                    <li key={entry.id}>
                                      {new Date(entry.correctedAt).toLocaleString()} · Selected record {entry.selectedRecordIndex + 1}
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </article>
                        ))}
                      </div>
                    ))) }
                  </div>}
                </section>
              )}
              {financialSummary && (
                <>
                  <section
                    className={`financial-validation ${financialValidation?.canFinalize ? 'ready' : 'blocked'}`}
                    aria-labelledby="financial-validation-title"
                  >
                    <h3 id="financial-validation-title">Financial Validation</h3>
                    <p role="status">
                      {financialValidation?.canFinalize
                        ? 'Ready for final processing.'
                        : 'Final processing is blocked until the listed issues are resolved.'}
                    </p>
                    {!financialValidation?.canFinalize && (
                      <ul>
                        {financialValidation?.issues.map((issue) => (
                          <li key={issue.kind}>
                            {issue.kind === 'room-conflict' && `${issue.count} unresolved room conflict(s)`}
                            {issue.kind === 'pricing-conflict' && `${issue.count} pricing conflict(s)`}
                            {issue.kind === 'missing-price' && `${issue.count} missing or invalid price(s)`}
                            {issue.kind === 'unresolved-occupancy' && `${issue.count} unresolved occupancy record(s)`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="financial-summary" aria-labelledby="financial-summary-title">
                    <h3 id="financial-summary-title">Financial Summary</h3>
                  <div className="financial-totals">
                    <span><strong>ILS</strong> {financialSummary.totals.ILS}</span>
                    <span><strong>USD</strong> {financialSummary.totals.USD}</span>
                  </div>
                  </section>
                </>
              )}
            </section>
          )}
          <button className="text-button" onClick={() => setView('home')}>
            Back to home
          </button>
          </div>
          <section className="folio-screen" hidden={view !== 'folio'} aria-labelledby="folio-screen-title">
            <div className="folio-screen-heading">
              <div>
                <p className="eyebrow">Project workspace</p>
                <h1 id="folio-screen-title">Folio Comparison</h1>
              </div>
              <button className="text-button" type="button" onClick={() => setView('workspace')}>
                Back to Workspace
              </button>
            </div>
            <FolioComparisonPanel
              groupRooms={selectedFolioGroupRooms}
              warningAcknowledgement={folioWarningAcknowledgement}
              onFolioLoaded={(fileHash) => {
                setFolioComparisonComplete(Boolean(fileHash));
                setFolioWarningAcknowledgement(fileHash ? { folioFileHash: fileHash, acknowledgedAt: '' } : null);
              }}
              onConfirmationNumberDetected={(confirmationNumber) => {
                if (!confirmationNumber) return;
                setProject((current) => current && !(current.pm ?? '').trim()
                  ? { ...current, pm: confirmationNumber, updatedAt: new Date().toISOString() }
                  : current);
              }}
              onComparisonResults={setFolioComparisonResults}
              onWarningAcknowledged={() => setFolioWarningAcknowledgement((current) => current
                ? { ...current, acknowledgedAt: new Date().toISOString() }
                : current)}
            />
            <RecoveryReviewPanel
              candidates={recoveryCandidates}
              adjustments={recoveryAdjustments}
              onCreateProposal={createRecoveryProposal}
              onUpdateAdjustment={updateRecoveryAdjustment}
              onApprove={approveRecovery}
              onCancel={cancelRecovery}
              onEdit={editRecovery}
              onRemove={removeRecovery}
            />
          </section>
          <section className="placeholder-screen" hidden={view !== 'complimentary-staff'} aria-labelledby="complimentary-staff-screen-title">
            <p className="eyebrow">Project workspace</p>
            <h1 id="complimentary-staff-screen-title">Complimentary &amp; Staff</h1>
            <ComplimentaryStaffPanel rows={complimentaryStaff} onChange={setComplimentaryStaff} />
          </section>
          <section className="placeholder-screen" hidden={view !== 'additional-charges'} aria-labelledby="additional-charges-screen-title">
            <p className="eyebrow">Project workspace</p>
            <h1 id="additional-charges-screen-title">Additional Charges</h1>
            <AdditionalChargesPanel rows={additionalCharges} onChange={setAdditionalCharges} />
          </section>
          <section className="export-screen" hidden={view !== 'export'} aria-labelledby="export-preview-title">
            {project && project.selectedGroupName && (
              <div className="project-metadata-controls" aria-label="Excel export metadata">
                <label>
                  Hotel name
                  <input
                    type="text"
                    value={project.hotelName ?? ''}
                    onChange={(event) => updateProjectMetadata('hotelName', event.target.value)}
                  />
                </label>
                <label>
                  Group name for export
                  <input
                    type="text"
                    value={project.groupNameOverride ?? project.selectedGroupName}
                    onChange={(event) => updateProjectMetadata('groupNameOverride', event.target.value)}
                  />
                </label>
                <label>
                  Export date override
                  <input
                    type="date"
                    value={project.reportDateOverride ?? ''}
                    onChange={(event) => updateProjectMetadata('reportDateOverride', event.target.value)}
                  />
                </label>
                <label>
                  PM / Confirmation number
                  <input
                    type="text"
                    value={project.pm ?? ''}
                    onChange={(event) => updateProjectMetadata('pm', event.target.value)}
                  />
                </label>
                <p className="muted project-metadata-note">These values affect display and export only; source report dates remain unchanged for calculations.</p>
              </div>
            )}
            <div className="export-language-switcher">
              <span className="export-language-label">Export template</span>
              <div className="export-language-options" role="group" aria-label="Export template">
                <button type="button" className="export-language-option" aria-pressed={exportLanguage === 'usd'} onClick={() => handleExportLanguageChange('usd')}>
                  English / USD
                </button>
                <button type="button" className="export-language-option" aria-pressed={exportLanguage === 'english-ils'} onClick={() => handleExportLanguageChange('english-ils')}>
                  English / ILS
                </button>
                <button type="button" className="export-language-option" aria-pressed={exportLanguage === 'hebrew'} onClick={() => handleExportLanguageChange('hebrew')}>
                  עברית / ILS
                </button>
              </div>
            </div>
            <ExportPreview
              model={exportModel}
              language={exportLanguage}
              rateOverrides={rateOverrides}
              onRateChange={(groupedRowId, value) => setRateOverrides((current) => new Map(current).set(groupedRowId, value))}
              folioComparisonComplete={folioComparisonComplete}
              onExport={(final) => void handleExcelExport(final)}
            />
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="home-card" aria-labelledby="home-title">
        <p className="eyebrow">Local-first hotel finance workspace</p>
        <h1 id="home-title">Hotel Breakdown</h1>
        <p className="intro">
          Build a reliable breakdown from daily group reports, with the source files
          staying on this device.
        </p>
        <div className="action-grid">
          <button className="primary-button" onClick={handleNewProject}>
            New Project
          </button>
          <button className="secondary-button" onClick={() => void handleContinueProject()}>
            Continue Project
          </button>
        </div>
      </section>
    </main>
  );
}

function formatConflictField(field: ConflictField): string {
  return field.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase());
}

function formatConflictValue(value: RoomRecord[ConflictField]): string {
  return value === null || value === '' ? 'blank' : String(value);
}

function getPricingResult(room: RoomRecord, reportDate: string, rules: PricingRule[]) {
  return matchPricingRule({
    reportDate: reportDate as `${number}-${number}-${number}`,
    roomType: room.bookedRoomType ?? room.actualRoomType ?? '',
    adults: room.adults,
    children: room.children,
  }, rules);
}

function getPricingResultKind(room: RoomRecord, reportDate: string, rules: PricingRule[]): string {
  return getPricingResult(room, reportDate, rules).kind;
}

function formatPricingResult(room: RoomRecord, reportDate: string, rules: PricingRule[]): string {
  const result = getPricingResult(room, reportDate, rules);
  if (result.kind === 'matched') {
    return `Matched: ${result.rule.rate} ${result.rule.currency}`;
  }
  if (result.kind === 'pricing-conflict') {
    return `Pricing Conflict: ${result.rules.length} rules`;
  }
  return 'Missing Price';
}

export default App;
