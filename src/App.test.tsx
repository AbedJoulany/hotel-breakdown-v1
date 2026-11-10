import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const analyzeGroupReportPdf = vi.hoisted(() => vi.fn());
const loadWorkspaceSnapshot = vi.hoisted(() => vi.fn());
const saveWorkspaceSnapshot = vi.hoisted(() => vi.fn());
const extractPdfTextPages = vi.hoisted(() => vi.fn());
const parseFolio = vi.hoisted(() => vi.fn());
const hashArrayBuffer = vi.hoisted(() => vi.fn());

vi.mock('./application/reports/analyzeGroupReportPdf', () => ({
  analyzeGroupReportPdf,
}));

vi.mock('./infrastructure/storage/workspaceStore', () => ({
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
}));

vi.mock('./infrastructure/pdf/pdfTextExtractor', () => ({
  extractPdfTextPages,
}));

vi.mock('./infrastructure/pdf/parseFolio', () => ({
  parseFolio,
}));

vi.mock('./infrastructure/files/hashArrayBuffer', () => ({
  hashArrayBuffer,
}));

afterEach(() => {
  cleanup();
  analyzeGroupReportPdf.mockReset();
  loadWorkspaceSnapshot.mockReset();
  loadWorkspaceSnapshot.mockResolvedValue(null);
  saveWorkspaceSnapshot.mockReset();
  saveWorkspaceSnapshot.mockResolvedValue(undefined);
  extractPdfTextPages.mockReset();
  parseFolio.mockReset();
  hashArrayBuffer.mockReset();
  hashArrayBuffer.mockResolvedValue('test-file-hash');
});

describe('Home', () => {
  it('shows the two primary project actions', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Project' })).toBeInTheDocument();
  });

  it('restores a saved project from Continue Project', async () => {
    loadWorkspaceSnapshot.mockResolvedValue({
      project: {
        id: 'project-saved',
        name: 'Saved Project',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
        reportIds: ['report-saved'],
        selectedGroupName: null,
        dateRange: { start: '2026-10-24', end: '2026-10-24' },
      },
      reports: [{
        id: 'report-saved',
        reportDate: '2026-10-24',
        originalFileName: '24.10.26.pdf',
        contentHash: 'saved-hash',
        groupSnapshots: [],
      }],
      analyses: [{
        reportDate: '2026-10-24',
        groups: [],
      }],
      analysis: {
        reportDate: '2026-10-24',
        groups: [],
      },
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue Project' }));

    await waitFor(() => expect(screen.getByText('Project: Saved Project')).toBeInTheDocument());
    expect(screen.getByText('Saved project restored.')).toBeInTheDocument();
    expect(screen.getByText('Coverage: 2026-10-24 to 2026-10-24')).toBeInTheDocument();
  });

  it('restores Additional Charges and Complimentary & Staff rows from Continue Project', async () => {
    loadWorkspaceSnapshot.mockResolvedValue({
      project: {
        id: 'project-saved', name: 'Saved Project', createdAt: '2026-10-24T00:00:00.000Z', updatedAt: '2026-10-24T00:00:00.000Z',
        reportIds: [], selectedGroupName: null, dateRange: { start: null, end: null },
      },
      reports: [], analyses: [], analysis: null, corrections: [], correctionHistory: [], pricingRules: [],
      additionalCharges: [{ id: 'charge-saved', description: 'Breakfast', price: '25', quantity: '2', number: '1', currency: 'USD' }],
      complimentaryStaff: [{ id: 'staff-saved', type: 'staff', amount: '30', number: '1', currency: 'ILS' }],
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue Project' }));
    await waitFor(() => expect(screen.getByText('Saved project restored.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Additional Charges' }));
    expect(screen.getByLabelText('Description 1')).toHaveValue('Breakfast');
    expect(screen.getByLabelText('Price 1')).toHaveValue(25);
    expect(screen.getByLabelText('Currency 1')).toHaveValue('USD');

    fireEvent.click(screen.getByRole('button', { name: 'Complimentary & Staff' }));
    expect(screen.getByLabelText('Complimentary Type 1')).toHaveValue('staff');
    expect(screen.getByLabelText('Complimentary Amount 1')).toHaveValue(30);
    expect(screen.getByLabelText('Complimentary Currency 1')).toHaveValue('ILS');
  });

  it('opens the workspace placeholder from New Project', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));

    expect(screen.getByRole('heading', { name: 'Project workspace' })).toBeInTheDocument();
    expect(screen.getByText('Project: Untitled Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Group report PDF')).toHaveAttribute('multiple');
  });

  it('opens Folio Comparison as a separate screen and returns without reprocessing reports', async () => {
    analyzeGroupReportPdf.mockResolvedValue({
      reportDate: '2026-10-24',
      groups: [],
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));

    const file = new File(['pdf'], '24.10.26.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(0) });
    fireEvent.change(screen.getByLabelText('Group report PDF'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText('1 added · 0 replaced · 0 duplicate')).toBeInTheDocument());
    expect(analyzeGroupReportPdf).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Folio Comparison' }));
    expect(screen.getByRole('heading', { name: 'Folio Comparison', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Folio PDF')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Project workspace' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Workspace' }));
    expect(screen.getByRole('heading', { name: 'Project workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Folio Comparison', level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText('Coverage: 2026-10-24 to 2026-10-24')).toBeInTheDocument();
    expect(analyzeGroupReportPdf).toHaveBeenCalledTimes(1);
  });

  it('preserves uploaded Folio data across placeholder navigation', async () => {
    analyzeGroupReportPdf.mockResolvedValue({
      reportDate: '2026-10-24',
      groups: [{
        reportId: 'report-folio',
        reportDate: '2026-10-24',
        groupName: 'Folio Group',
        rooms: [{
          roomNumber: '0524',
          guestName: 'Guest A',
          reservationNumber: null,
          bookedRoomType: 'STR',
          actualRoomType: 'STR',
          blockCode: null,
          fromDate: null,
          toDate: null,
          adults: 1,
          children: 0,
          babies: null,
          rooms: 1,
          rateCode: null,
          reportedRate: '100.00',
        }],
        occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0524'], duplicateRoomNumbers: [] },
        conflicts: [],
      }],
    });
    extractPdfTextPages.mockResolvedValue([]);
    parseFolio.mockReturnValue({
      currency: 'ILS',
      totals: { ILS: '100.00', USD: null },
      entries: [{
        roomNumber: '0524',
        guestName: 'Guest A',
        transactionDate: '2026-10-24',
        description: '0524 Guest A',
        charges: '100.00',
        credits: null,
        nights: null,
        currency: 'ILS',
      }],
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    const groupFile = new File(['group-pdf'], '24.10.26.pdf', { type: 'application/pdf' });
    Object.defineProperty(groupFile, 'arrayBuffer', { value: async () => new ArrayBuffer(0) });
    fireEvent.change(screen.getByLabelText('Group report PDF'), { target: { files: [groupFile] } });

    await waitFor(() => expect(screen.getByText('Folio Group')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Select group Folio Group on 2026-10-24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Folio Comparison' }));

    const folioFile = new File(['folio-pdf'], 'folio.pdf', { type: 'application/pdf' });
    Object.defineProperty(folioFile, 'arrayBuffer', { value: async () => new ArrayBuffer(1) });
    fireEvent.change(screen.getByLabelText('Folio PDF'), { target: { files: [folioFile] } });

    await waitFor(() => expect(screen.getByText('Matched')).toBeInTheDocument());
    expect(extractPdfTextPages).toHaveBeenCalledTimes(1);
    expect(parseFolio).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Complimentary & Staff' }));
    expect(screen.getByRole('heading', { name: 'Complimentary & Staff' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excel Export' }));
    expect(screen.getByRole('heading', { name: 'Export Preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Additional Charges' }));
    expect(screen.getByRole('heading', { name: 'Additional Charges' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Export Preview' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Folio Comparison' }));

    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(extractPdfTextPages).toHaveBeenCalledTimes(1);
    expect(parseFolio).toHaveBeenCalledTimes(1);
    expect(analyzeGroupReportPdf).toHaveBeenCalledTimes(1);
  });

  it('shows analyzed groups after a PDF is selected', async () => {
    analyzeGroupReportPdf.mockResolvedValue({
      reportDate: '2026-10-24',
      groups: [{
        reportId: 'report-1',
        reportDate: '2026-10-24',
        groupName: 'Etgar-Nof Va Yam',
        rooms: [
          { roomNumber: '0524', guestName: 'Guest A', reservationNumber: null, bookedRoomType: null, actualRoomType: null, blockCode: null, fromDate: null, toDate: null, adults: 1, children: null, babies: null, rooms: 1, rateCode: null, reportedRate: null },
          { roomNumber: '0524', guestName: 'Guest B', reservationNumber: null, bookedRoomType: null, actualRoomType: null, blockCode: null, fromDate: null, toDate: null, adults: 1, children: null, babies: null, rooms: 2, rateCode: null, reportedRate: null },
        ],
        occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0524'], duplicateRoomNumbers: [] },
        conflicts: [{ roomNumber: '0524', recordIndexes: [0, 1], conflictingFields: ['rooms'] }],
      }],
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    const file = new File(['pdf'], '24.10.26.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(0) });
    fireEvent.change(screen.getByLabelText('Group report PDF'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(screen.getByText('Etgar-Nof Va Yam')).toBeInTheDocument());
    expect(screen.getByText('Report date: 2026-10-24')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select group Etgar-Nof Va Yam on 2026-10-24' }));
    expect(screen.getByText('Selected group: Etgar-Nof Va Yam')).toBeInTheDocument();
    expect(screen.getByText('Room conflicts · 2026-10-24')).toBeInTheDocument();
    expect(screen.getByText('Different fields: Rooms')).toBeInTheDocument();
    expect(screen.getByText(/Record 1 · Guest A · Rooms: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Record 2 · Guest B · Rooms: 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use record 2' }));
    expect(screen.getByRole('button', { name: 'Selected record' })).toBeInTheDocument();
    expect(screen.queryByText('0524 · Guest A')).not.toBeInTheDocument();
    expect(screen.getByText('0524 · Guest B')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Correction history for room 0524' })).toBeInTheDocument();
    await waitFor(() => expect(saveWorkspaceSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
      corrections: [expect.objectContaining({ selectedRecordIndex: 1 })],
      correctionHistory: [expect.objectContaining({ selectedRecordIndex: 1 })],
    })));
    fireEvent.change(screen.getByLabelText('Report date'), { target: { value: '2026-10-24' } });
    fireEvent.change(screen.getByLabelText('Room Type'), { target: { value: 'STR' } });
    fireEvent.change(screen.getByLabelText('Adults'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Children'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Rate'), { target: { value: '125.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pricing rule' }));
    expect(screen.getByText('2026-10-24 · STR · A1/C0 · 125.00 ILS')).toBeInTheDocument();
    await waitFor(() => expect(saveWorkspaceSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
      pricingRules: [expect.objectContaining({ reportDate: '2026-10-24', roomType: 'STR', adults: 1, children: 0 })],
    })));
    expect(screen.getByText('Coverage: 2026-10-24 to 2026-10-24')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Room-Nights: 1' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-26' } });
    expect(screen.getByText('Missing report date(s) in selected range: 2026-10-25, 2026-10-26')).toBeInTheDocument();
  });

  it('adds, calculates, and deletes additional charge rows', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Additional Charges' }));

    fireEvent.change(screen.getByLabelText('Description 1'), { target: { value: 'Breakfast' } });
    fireEvent.change(screen.getByLabelText('Price 1'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Currency 1'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Total 1')).toHaveTextContent('50.00');
    expect(screen.getByLabelText('Number 1')).toHaveValue(1);
    await waitFor(() => expect(saveWorkspaceSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
      additionalCharges: [expect.objectContaining({ description: 'Breakfast', price: '25', quantity: '2', number: '1', currency: 'USD' })],
    })));

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByLabelText('Description 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 2' }));
    expect(screen.queryByLabelText('Description 2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeDisabled();
  });

  it('adds, calculates, and persists Complimentary and Staff rows', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complimentary & Staff' }));

    fireEvent.change(screen.getByLabelText('Complimentary Type 1'), { target: { value: 'staff' } });
    fireEvent.change(screen.getByLabelText('Complimentary Amount 1'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Complimentary Currency 1'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Complimentary Number 1')).toHaveValue(1);
    expect(screen.getByLabelText('Complimentary Total 1')).toHaveTextContent('30.00');
    await waitFor(() => expect(saveWorkspaceSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
      complimentaryStaff: [expect.objectContaining({ type: 'staff', amount: '30', number: '1', currency: 'USD' })],
    })));

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByLabelText('Complimentary Type 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 2' }));
    expect(screen.queryByLabelText('Complimentary Type 2')).not.toBeInTheDocument();
  });

  it('shows Complimentary & Staff input validation without changing financial rules', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complimentary & Staff' }));

    expect(screen.getByRole('alert', { name: 'Complimentary and staff validation' })).toHaveTextContent('Amount is required.');
    fireEvent.change(screen.getByLabelText('Complimentary Amount 1'), { target: { value: '-5' } });
    fireEvent.change(screen.getByLabelText('Complimentary Number 1'), { target: { value: '0' } });
    expect(screen.getByRole('alert', { name: 'Complimentary and staff validation' })).toHaveTextContent('Amount must be a valid non-negative number.');
    expect(screen.getByRole('alert', { name: 'Complimentary and staff validation' })).toHaveTextContent('Number must be a whole number greater than 0.');
    expect(screen.getByLabelText('Complimentary Total 1')).toHaveTextContent('—');
  });

  it('processes multiple group reports and keeps one active report per date', async () => {
    analyzeGroupReportPdf.mockReset();
    analyzeGroupReportPdf
      .mockResolvedValueOnce({
        reportDate: '2026-10-24',
        groups: [{
          reportId: 'report-24',
          reportDate: '2026-10-24',
          groupName: 'Etgar-Nof Va Yam',
          rooms: [{
            roomNumber: '0524',
            guestName: 'Guest 24',
            reservationNumber: null,
            bookedRoomType: null,
            actualRoomType: null,
            blockCode: null,
            fromDate: null,
            toDate: null,
            adults: null,
            children: null,
            babies: null,
            rooms: null,
            rateCode: null,
            reportedRate: null,
          }],
          occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0524'], duplicateRoomNumbers: [] },
          conflicts: [],
        }],
      })
      .mockResolvedValueOnce({
        reportDate: '2026-10-25',
        groups: [{
          reportId: 'report-25',
          reportDate: '2026-10-25',
          groupName: 'Etgar-Nof Va Yam',
          rooms: [{
            roomNumber: '0525',
            guestName: 'Guest 25',
            reservationNumber: null,
            bookedRoomType: null,
            actualRoomType: null,
            blockCode: null,
            fromDate: null,
            toDate: null,
            adults: null,
            children: null,
            babies: null,
            rooms: null,
            rateCode: null,
            reportedRate: null,
          }],
          occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0525'], duplicateRoomNumbers: [] },
          conflicts: [],
        }],
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    const firstFile = new File(['pdf-24'], '24.10.26.pdf', { type: 'application/pdf' });
    const secondFile = new File(['pdf-25-longer'], '25.10.26.pdf', { type: 'application/pdf' });
    Object.defineProperty(firstFile, 'arrayBuffer', { value: async () => new ArrayBuffer(2) });
    Object.defineProperty(secondFile, 'arrayBuffer', { value: async () => new ArrayBuffer(3) });

    fireEvent.change(screen.getByLabelText('Group report PDF'), {
      target: { files: [firstFile, secondFile] },
    });

    await waitFor(() => expect(screen.getByText('2 added · 0 replaced · 0 duplicate')).toBeInTheDocument());
    expect(screen.getByText('Coverage: 2026-10-24 to 2026-10-25')).toBeInTheDocument();
    expect(screen.getByText('1 groups · 2 active report(s)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Groups for 2026-10-24' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Groups for 2026-10-25' })).toBeInTheDocument();
    expect(screen.queryByText('0524 · Guest 24')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select group Etgar-Nof Va Yam on 2026-10-24' }));
    expect(screen.getByText('0524 · Guest 24')).toBeInTheDocument();
    expect(screen.getByText('0525 · Guest 25')).toBeInTheDocument();
    expect(analyzeGroupReportPdf).toHaveBeenCalledTimes(2);
  });

  it('shows a failed file and retries only that file', async () => {
    analyzeGroupReportPdf.mockReset();
    analyzeGroupReportPdf
      .mockRejectedValueOnce(new Error('unsupported PDF'))
      .mockResolvedValueOnce({
        reportDate: '2026-10-23',
        groups: [{
          reportId: 'report-retry',
          reportDate: '2026-10-23',
          groupName: 'Retry Group',
          rooms: [],
          occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0523'], duplicateRoomNumbers: [] },
          conflicts: [],
        }],
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    const file = new File(['pdf'], '23.10.26.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(4) });
    fireEvent.change(screen.getByLabelText('Group report PDF'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry 23.10.26.pdf' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry 23.10.26.pdf' }));

    await waitFor(() => expect(screen.getByText('Retry Group')).toBeInTheDocument());
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(analyzeGroupReportPdf).toHaveBeenCalledTimes(2);
  });
});
