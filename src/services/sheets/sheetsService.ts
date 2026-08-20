import { getDocs, collection, addDoc, query, where, orderBy, limit, getDocs as getAllDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createMember } from '@/services/members/memberService';
import { getDistrictName, getVillageName } from '@/constants/regions';
import { hashString, maskNIK } from '@/utils/permissions';
import type { Member, SheetConfig, SheetColumnMapping, SheetRow, SyncRecord } from '@/types';

// ---- Default Column Mapping ----

export const DEFAULT_COLUMNS: SheetColumnMapping[] = [
  { sheetHeader: 'Nama Lengkap', memberField: 'name' },
  { sheetHeader: 'NIK', memberField: 'nik' },
  { sheetHeader: 'Tempat Lahir', memberField: 'birthPlace' },
  { sheetHeader: 'Tanggal Lahir', memberField: 'birthDate' },
  { sheetHeader: 'Jenis Kelamin', memberField: 'gender' },
  { sheetHeader: 'Alamat', memberField: 'address' },
  { sheetHeader: 'No. Telepon', memberField: 'phone' },
  { sheetHeader: 'Kecamatan', memberField: 'districtName' },
  { sheetHeader: 'Desa/Kelurahan', memberField: 'villageName' },
  { sheetHeader: 'Status', memberField: 'status' },
  { sheetHeader: 'Verifikasi', memberField: 'verificationStatus' },
];

// ---- Google API Types (minimal, no external dependency) ----

interface GapiClient {
  load: (name: string, callback: () => void) => void;
  client: {
    init: (config: { apiKey?: string; clientId: string; scope: string; discoveryDocs: string[] }) => Promise<void>;
    sheets: {
      spreadsheets: {
        values: {
          get: (params: { spreadsheetId: string; range: string }) => Promise<GetResponse>;
          update: (params: { spreadsheetId: string; range: string; valueInputOption: string; resource: UpdateResource }) => Promise<UpdateResponse>;
          append: (params: { spreadsheetId: string; range: string; valueInputOption: string; insertDataOption: string; resource: AppendResource }) => Promise<AppendResponse>;
          clear: (params: { spreadsheetId: string; range: string }) => Promise<{}>;
        };
        batchUpdate: (params: { spreadsheetId: string; resource: BatchUpdateResource }) => Promise<{}>;
      };
    };
  };
  auth2: {
    getAuthInstance: () => {
      isSignedIn: { get: () => boolean };
      signIn: () => Promise<void>;
      signOut: () => void;
      currentUser: { get: () => { getBasicProfile: () => { getName: () => string; getEmail: () => string } } | null };
    };
  };
}

interface GetResponse {
  result: {
    range: string;
    majorDimension: string;
    values: string[][];
  };
}

interface UpdateResponse {
  result: {
    updatedRange: string;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
  };
}

interface AppendResponse {
  result: {
    updates: {
      spreadsheetId: string;
      updatedRange: string;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
    };
  };
}

interface UpdateResource {
  values: string[][];
  majorDimension: string;
}

interface AppendResource {
  values: string[][];
  majorDimension: string;
}

interface BatchUpdateResource {
  requests: { addSheet: { properties: { title: string } } }[];
}

// ---- Global gapi reference ----

declare global {
  interface Window {
    gapi: GapiClient;
  }
}

// ---- Config Management ----

const CONFIG_KEY = 'partaiapp_sheets_config';
const API_KEY = 'AIzaSyBe3RIwPGyEi-agimhzjT4L4WdyDrrOvRA'; // Reuse Firebase API key
const CLIENT_ID = ''; // User must set their own Google Client ID
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

export function getSheetsConfig(): SheetConfig | null {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveSheetsConfig(config: SheetConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config, lastSyncAt: Date.now() }));
}

export function clearSheetsConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

// ---- GAPI Loading & Auth ----

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: { requestAccessToken: (config: { prompt: string }) => void } | null = null;

function loadGapiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.gapi) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google API script'));
    document.head.appendChild(script);
  });
}

export async function initGoogleAPI(clientId: string): Promise<boolean> {
  try {
    await loadGapiScript();

    // gapi.client.init requires clientId when using OAuth.
    // We pass apiKey optionally.
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: API_KEY,
          clientId,
          scope: SCOPES,
          discoveryDocs: [DISCOVERY_DOC],
        }).then(resolve).catch(reject);
      });
    });

    gapiLoaded = true;
    return true;
  } catch {
    return false;
  }
}

export function isSignedIn(): boolean {
  try {
    return gapiLoaded && window.gapi?.auth2?.getAuthInstance()?.isSignedIn?.get() === true;
  } catch {
    return false;
  }
}

export async function signIn(): Promise<boolean> {
  try {
    if (!gapiLoaded) return false;
    await window.gapi.auth2.getAuthInstance().signIn();
    return true;
  } catch {
    return false;
  }
}

export function signOut(): void {
  try {
    if (gapiLoaded) window.gapi.auth2.getAuthInstance().signOut();
  } catch { /* */ }
}

export function getUserName(): string {
  try {
    return window.gapi?.auth2?.getAuthInstance()?.currentUser?.get()?.getBasicProfile?.()?.getName() || '';
  } catch {
    return '';
  }
}

// ---- Spreadsheet Operations ----

export async function getSheetHeaders(spreadsheetId: string, sheetName: string): Promise<string[]> {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  return response.result.values?.[0] || [];
}

export async function getSheetData(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  return response.result.values || [];
}

export async function ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
  try {
    await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:A1`,
    });
  } catch {
    // Sheet doesn't exist, create it
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: { properties: { title: sheetName } },
        }],
      },
    });
  }
}

// ---- Export: Firestore → Google Sheets ----

export async function exportToSheet(
  spreadsheetId: string,
  sheetName: string,
  columns: SheetColumnMapping[],
  districtId?: string,
  villageId?: string,
): Promise<{ rows: number }> {
  // Ensure sheet exists
  await ensureSheetExists(spreadsheetId, sheetName);

  // Fetch members from Firestore
  let q: ReturnType<typeof query> = query(collection(db, 'members'));
  if (districtId) q = query(q, where('districtId', '==', districtId));
  if (villageId) q = query(q, where('villageId', '==', villageId));
  const snap = await getDocs(q);

  // Build header row
  const headerRow = columns.map(c => c.sheetHeader);
  headerRow.push('Terdaftar Pada'); // Extra column

  // Build data rows
  const dataRows: string[][] = [];
  snap.docs.forEach(doc => {
    const m = doc.data() as Member;
    const row: string[] = [];

    for (const col of columns) {
      const field = col.memberField;
      if (field === 'nik') {
        row.push(m.nikMasked || '');
      } else if (field === 'districtName') {
        row.push(getDistrictName(m.districtId));
      } else if (field === 'villageName') {
        row.push(getVillageName(m.districtId, m.villageId));
      } else if (field === 'gender') {
        row.push(m.gender === 'L' ? 'Laki-laki' : 'Perempuan');
      } else if (field === 'status') {
        const statusMap: Record<string, string> = { active: 'Aktif', inactive: 'Tidak Aktif', suspended: 'Ditangguhkan' };
        row.push(statusMap[m.status] || m.status);
      } else if (field === 'verificationStatus') {
        const vMap: Record<string, string> = { pending: 'Menunggu', verified: 'Terverifikasi', rejected: 'Ditolak' };
        row.push(vMap[m.verificationStatus] || m.verificationStatus);
      } else {
        row.push(String((m as unknown as Record<string, unknown>)[field] ?? ''));
      }
    }

    // Timestamp
    row.push(m.createdAt ? new Date(m.createdAt).toLocaleDateString('id-ID') : '');
    dataRows.push(row);
  });

  // Write to Google Sheets (header + data)
  const allValues = [headerRow, ...dataRows];

  // Clear existing data first
  try {
    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
  } catch { /* sheet may be empty */ }

  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    resource: {
      values: allValues,
      majorDimension: 'ROWS',
    },
  });

  return { rows: dataRows.length };
}

// ---- Import: Google Sheets → Firestore ----

export async function importFromSheet(
  spreadsheetId: string,
  sheetName: string,
  columns: SheetColumnMapping[],
  userId: string,
  districtId: string,
  villageId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ imported: number; errors: number; errorMessages: string[] }> {
  const allData = await getSheetData(spreadsheetId, sheetName);
  if (allData.length < 2) return { imported: 0, errors: 0, errorMessages: ['Tidak ada data baris'] };

  const headers = allData[0];
  const dataRows = allData.slice(1);

  // Build header → field mapping from columns config
  const headerToField: Record<number, string> = {};
  for (const col of columns) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === col.sheetHeader.toLowerCase());
    if (idx >= 0) headerToField[idx] = col.memberField;
  }

  let imported = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    onProgress?.(i + 1, dataRows.length);

    try {
      const rawMember: Record<string, string> = {};
      for (const [colIdx, field] of Object.entries(headerToField)) {
        rawMember[field] = row[Number(colIdx)] || '';
      }

      // Validate required fields
      const name = (rawMember.name || '').trim();
      const nik = (rawMember.nik || '').trim();

      if (!name) {
        errors++;
        errorMessages.push(`Baris ${i + 2}: Nama kosong`);
        continue;
      }

      // Parse gender
      let gender: 'L' | 'P' = 'L';
      const g = (rawMember.gender || '').toLowerCase().trim();
      if (g.includes('perempuan') || g.includes('wanita') || g === 'p') gender = 'P';

      // Parse status
      let status: Member['status'] = 'active';
      const s = (rawMember.status || '').toLowerCase().trim();
      if (s.includes('tidak aktif') || s === 'inactive') status = 'inactive';
      if (s.includes('ditangguhkan') || s === 'suspended') status = 'suspended';

      // Parse verification status
      let verificationStatus: Member['verificationStatus'] = 'pending';
      const v = (rawMember.verificationStatus || '').toLowerCase().trim();
      if (v.includes('verif') || v === 'verified') verificationStatus = 'verified';
      if (v.includes('tolak') || v === 'rejected') verificationStatus = 'rejected';

      await createMember(
        {
          name,
          nikHash: nik || `imp-${Date.now()}-${i}`,
          nikMasked: nik ? maskNIK(nik) : '',
          birthPlace: (rawMember.birthPlace || '').trim(),
          birthDate: (rawMember.birthDate || '').trim(),
          gender,
          address: (rawMember.address || '').trim(),
          phone: (rawMember.phone || '').trim(),
          districtId,
          villageId,
          status,
          verificationStatus,
        },
        userId,
      );
      imported++;
    } catch (err) {
      errors++;
      errorMessages.push(`Baris ${i + 2}: ${err instanceof Error ? err.message : 'Gagal'} `);
    }
  }

  return { imported, errors, errorMessages };
}

// ---- Sync History (Firestore) ----

export async function saveSyncRecord(record: Omit<SyncRecord, 'syncId'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sync_records'), record);
  return ref.id;
}

export async function getSyncHistory(userId: string, limitCount = 20): Promise<SyncRecord[]> {
  const q = query(
    collection(db, 'sync_records'),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ syncId: d.id, ...d.data() }) as SyncRecord);
}

// ---- Validation Helpers ----

export function extractSpreadsheetId(input: string): string {
  // Handle full URL: https://docs.google.com/spreadsheets/d/{ID}/edit
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  // Handle plain ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  return '';
}

export function getSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

export function getDirectionLabel(dir: 'export' | 'import'): { label: string; color: string } {
  return dir === 'export'
    ? { label: 'Ekspor', color: 'text-blue-600 bg-blue-50' }
    : { label: 'Impor', color: 'text-emerald-600 bg-emerald-50' };
}