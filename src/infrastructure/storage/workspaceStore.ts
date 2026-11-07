import type { AnalyzedGroupReport } from '../../application/reports/analyzeGroupReportPdf';
import type { Project } from '../../domain/projects/models';
import type { ActiveReportDocument } from '../../domain/reports/models';
import type { RoomCorrection } from '../../domain/reports/roomCorrections';
import type { PricingRule } from '../../domain/pricing/pricingRules';

export interface FolioWarningAcknowledgement {
  folioFileHash: string;
  acknowledgedAt: string;
}

const DATABASE_NAME = 'hotel-breakdown-v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspace';
const SNAPSHOT_KEY = 'current';

export interface WorkspaceSnapshot {
  project: Project;
  reports: ActiveReportDocument[];
  analyses: AnalyzedGroupReport[];
  analysis: AnalyzedGroupReport | null;
  corrections: RoomCorrection[];
  correctionHistory: RoomCorrection[];
  pricingRules: PricingRule[];
  folioWarningAcknowledgement?: FolioWarningAcknowledgement | null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open workspace storage'));
  });
}

export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot | null> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    request.onsuccess = () => {
      database.close();
      resolve((request.result as WorkspaceSnapshot | undefined) ?? null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error('Could not load workspace'));
    };
  });
}

export async function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Could not save workspace'));
    };
  });
}
