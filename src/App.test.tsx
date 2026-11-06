import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const analyzeGroupReportPdf = vi.hoisted(() => vi.fn());

vi.mock('./application/reports/analyzeGroupReportPdf', () => ({
  analyzeGroupReportPdf,
}));

afterEach(() => {
  cleanup();
});

describe('Home', () => {
  it('shows the two primary project actions', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Project' })).toBeInTheDocument();
  });

  it('opens the workspace placeholder from New Project', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));

    expect(screen.getByRole('heading', { name: 'Project workspace' })).toBeInTheDocument();
    expect(screen.getByText('Project: Untitled Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Group report PDF')).toHaveAttribute('multiple');
  });

  it('shows analyzed groups after a PDF is selected', async () => {
    analyzeGroupReportPdf.mockResolvedValue({
      reportDate: '2026-10-24',
      groups: [{
        reportId: 'report-1',
        reportDate: '2026-10-24',
        groupName: 'Etgar-Nof Va Yam',
        rooms: [],
        occupancy: { occupiedRoomCount: 1, occupiedRoomNumbers: ['0524'], duplicateRoomNumbers: [] },
        conflicts: [],
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
    expect(screen.getByText('Coverage: 2026-10-24 to 2026-10-24')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Room-Nights: 0' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-26' } });
    expect(screen.getByText('Missing report date(s) in selected range: 2026-10-25, 2026-10-26')).toBeInTheDocument();
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
});
