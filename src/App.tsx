import { useEffect, useState } from 'react';
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
import PricingRulesPanel from './components/PricingRulesPanel';
import { hashArrayBuffer } from './infrastructure/files/hashArrayBuffer';
import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from './infrastructure/storage/workspaceStore';

type View = 'home' | 'workspace';
type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
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
  const [corrections, setCorrections] = useState<RoomCorrection[]>([]);
  const [correctionHistory, setCorrectionHistory] = useState<RoomCorrection[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
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
  const roomNightSummary = project?.selectedGroupName
    ? calculateGroupRoomNights(correctedReports, project.selectedGroupName)
    : null;
  const selectedPricingDays = project?.selectedGroupName
    ? analyses.flatMap((report) => report.groups
      .filter((group) => groupMatchKey(group.groupName) === groupMatchKey(project.selectedGroupName ?? ''))
      .map((group) => ({
        reportDate: report.reportDate as `${number}-${number}-${number}`,
        rooms: applyRoomCorrections(
          group.rooms,
          corrections.filter((correction) => correction.reportId === group.reportId),
        ),
      })))
    : [];
  const financialSummary = project?.selectedGroupName
    ? calculateFinancialSummary(selectedPricingDays, pricingRules)
    : null;
  useEffect(() => {
    if (!project) {
      return;
    }

    void saveWorkspaceSnapshot({ project, reports, analyses, analysis, corrections, correctionHistory, pricingRules })
      .catch(() => setError('Could not save the workspace locally.'));
  }, [analysis, analyses, project, reports, corrections, correctionHistory, pricingRules]);
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
    setCorrections([]);
    setCorrectionHistory([]);
    setPricingRules([]);
    setProject(createProject({
      id: `project-${Date.now()}`,
      name: 'Untitled Project',
      now,
    }));
    setView('workspace');
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
      setReportMessage('Saved project restored.');
    } catch {
      setError('Could not load the saved workspace from this device.');
    }
  }

  function handleGroupSelection(groupName: string) {
    setProject((current) => current ? {
      ...current,
      selectedGroupName: groupName,
      updatedAt: new Date().toISOString(),
    } : current);
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

  if (view === 'workspace') {
    return (
      <main className="app-shell">
        <section className="workspace-card" aria-labelledby="workspace-title">
          <p className="eyebrow">Hotel Breakdown V1</p>
          <h1 id="workspace-title">Project workspace</h1>
          {project && <p className="project-name">Project: {project.name}</p>}
          <p className="muted">Upload a daily group report to inspect its detected groups.</p>
          <label className="upload-box">
            <span>Group report PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(event) => void handleReportUpload(event.target.files)}
            />
          </label>
          {fileName && <p className="file-name">Selected: {fileName}</p>}
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
                      value={project.dateRange.start ?? ''}
                      onChange={(event) => {
                        setDateRangeEdited(true);
                        setProject((current) => current ? {
                          ...current,
                          dateRange: { ...current.dateRange, start: event.target.value as Project['dateRange']['start'] },
                          updatedAt: new Date().toISOString(),
                        } : current);
                      }}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={project.dateRange.end ?? ''}
                      onChange={(event) => {
                        setDateRangeEdited(true);
                        setProject((current) => current ? {
                          ...current,
                          dateRange: { ...current.dateRange, end: event.target.value as Project['dateRange']['end'] },
                          updatedAt: new Date().toISOString(),
                        } : current);
                      }}
                    />
                  </label>
                </div>
              )}
              {selectedRangeInvalid && (
                <p className="warning-text" role="alert">Start date must not be after end date.</p>
              )}
              {!selectedRangeInvalid && selectedRangeMissingDates.length > 0 && (
                <p className="warning-text" role="alert">
                  Missing report date(s) in selected range: {selectedRangeMissingDates.join(', ')}
                </p>
              )}
              {analyses.map((report) => (
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
                  <h3 id="room-night-title">Room-Nights: {roomNightSummary.totalRoomNights}</h3>
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
                </section>
              )}
              {financialSummary && (
                <section className="financial-summary" aria-labelledby="financial-summary-title">
                  <h3 id="financial-summary-title">Financial Summary</h3>
                  <div className="financial-totals">
                    <span><strong>ILS</strong> {financialSummary.totals.ILS}</span>
                    <span><strong>USD</strong> {financialSummary.totals.USD}</span>
                  </div>
                </section>
              )}
            </section>
          )}
          <button className="text-button" onClick={() => setView('home')}>
            Back to home
          </button>
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

