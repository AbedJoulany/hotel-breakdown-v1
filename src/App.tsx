import { useState } from 'react';
import { analyzeGroupReportPdf } from './application/reports/analyzeGroupReportPdf';
import type { AnalyzedGroupReport } from './application/reports/analyzeGroupReportPdf';
import { createProject } from './domain/projects/createProject';
import type { Project } from './domain/projects/models';
import { replaceReportForDate } from './domain/reports/replaceReport';
import type { ActiveReportDocument } from './domain/reports/models';
import { findMissingReportDates, summarizeReportCoverage } from './domain/reports/reportCoverage';
import { calculateGroupRoomNights } from './domain/reports/roomNights';
import { hashArrayBuffer } from './infrastructure/files/hashArrayBuffer';

type View = 'home' | 'workspace';

function App() {
  const [view, setView] = useState<View>('home');
  const [analysis, setAnalysis] = useState<AnalyzedGroupReport | null>(null);
  const [analyses, setAnalyses] = useState<AnalyzedGroupReport[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<ActiveReportDocument[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [dateRangeEdited, setDateRangeEdited] = useState(false);
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
  const roomNightSummary = project?.selectedGroupName
    ? calculateGroupRoomNights(reports, project.selectedGroupName)
    : null;
  async function handleReportUpload(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) {
      return;
    }

    setFileName(files.map((file) => file.name).join(', '));
    setError(null);
    setReportMessage(null);

    let activeReports = reports;
    let latestAnalysis = analysis;
    let activeAnalyses = analyses;
    let added = 0;
    let replaced = 0;
    let duplicates = 0;
    let failed = 0;

    for (const file of files) {
      try {
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
        const result = replaceReportForDate(activeReports, candidate);
        activeReports = result.reports;

        if (result.kind === 'ignored-duplicate') {
          duplicates += 1;
        } else {
          latestAnalysis = parsed;
          activeAnalyses = [
            ...activeAnalyses.filter((report) => report.reportDate !== parsed.reportDate),
            parsed,
          ].sort((left, right) => left.reportDate.localeCompare(right.reportDate));
          if (result.kind === 'replaced') {
            replaced += 1;
          } else {
            added += 1;
          }
        }
      } catch {
        failed += 1;
      }
    }

    const nextCoverage = summarizeReportCoverage(activeReports);
    setReports(activeReports);
    setAnalysis(latestAnalysis);
    setAnalyses(activeAnalyses);
    setProject((current) => current ? {
      ...current,
      reportIds: activeReports.map((report) => report.id),
      dateRange: nextCoverage && !dateRangeEdited
        ? { start: nextCoverage.start, end: nextCoverage.end }
        : current.dateRange,
      updatedAt: new Date().toISOString(),
    } : current);
    setReportMessage(`${added} added · ${replaced} replaced · ${duplicates} duplicate`);
    if (failed > 0) {
      setError(`${failed} file(s) could not be analyzed. Other files were processed.`);
    }
  }

  function handleNewProject() {
    const now = new Date().toISOString();
    setProject(createProject({
      id: `project-${Date.now()}`,
      name: 'Untitled Project',
      now,
    }));
    setView('workspace');
  }

  function handleGroupSelection(groupName: string) {
    setProject((current) => current ? {
      ...current,
      selectedGroupName: groupName,
      updatedAt: new Date().toISOString(),
    } : current);
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
                        className={`group-row${project?.selectedGroupName === group.groupName ? ' selected' : ''}`}
                        key={`${report.reportDate}-${group.groupName}-${group.reportId}`}
                        aria-label={`Select group ${group.groupName} on ${report.reportDate}`}
                        aria-pressed={project?.selectedGroupName === group.groupName}
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
                    <strong>Selected group rooms</strong>
                    {analyses.map((report) => report.groups
                      .filter((group) => group.groupName === project?.selectedGroupName)
                      .map((group) => group.rooms.length > 0 && (
                        <div key={`${report.reportDate}-${group.groupName}-rooms`}>
                          <strong>{report.reportDate}</strong>
                          {group.rooms.map((room, index) => (
                            <span key={`${room.roomNumber}-${index}`}>
                              {room.roomNumber} · {room.guestName}
                            </span>
                          ))}
                        </div>
                      )))}
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
          <button className="secondary-button" onClick={() => setView('workspace')}>
            Continue Project
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
