export type UserRole =
  | 'super_admin'
  | 'admin_kabupaten'
  | 'admin_kecamatan'
  | 'admin_desa'
  | 'kader'
  | 'viewer';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  districtId?: string;
  villageId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile extends User {
  phone?: string;
  xp?: number;
  level?: number;
  badges?: string[];
}

export interface Member {
  memberId: string;
  name: string;
  nikHash: string;
  nikMasked: string;
  birthPlace: string;
  birthDate: string;
  gender: 'L' | 'P';
  address: string;
  phone: string;
  districtId: string;
  villageId: string;
  photoUrl?: string;
  documentUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  registeredBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Region {
  provinceId: string;
  provinceName: string;
  districts: District[];
}

export interface District {
  districtId: string;
  districtName: string;
 villages: Village[];
}

export interface Village {
  villageId: string;
  villageName: string;
}

export interface ActivityLog {
  activityId: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId?: string;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  auditId: string;
  userId: string;
  userName?: string;
  action: string;
  targetType: string;
  targetId?: string;
  districtId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'reward' | 'level_up';
  read: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface DashboardStats {
  totalMembers: number;
  activeCadres: number;
  newMembersThisMonth: number;
  verifiedData: number;
  pendingVerification: number;
  todayActivities: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface KaderTarget {
  targetId: string;
  userId: string;
  period: string; // e.g. '2025-01'
  targetMembers: number;
  achievedMembers: number;
  targetVerified: number;
  achievedVerified: number;
  createdAt: number;
  updatedAt: number;
}

export interface TrainingRecord {
  trainingId: string;
  title: string;
  type: 'online' | 'offline' | 'quiz';
  score?: number;
  maxScore?: number;
  xpEarned: number;
  completedAt: number;
}

export interface KTPData {
  nik: string;
  name: string;
  birthPlace: string;
  birthDate: string;
  gender: 'L' | 'P' | '';
  address: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
}

export interface OCRResult {
  success: boolean;
  rawText: string;
  confidence: number;
  ktpData: Partial<KTPData>;
  processedAt: number;
  processingTime: number;
}

export type DocumentScanStatus = 'scanning' | 'success' | 'partial' | 'failed';

export interface DocumentScan {
  scanId: string;
  userId: string;
  memberId?: string;
  type: 'ktp' | 'kk' | 'other';
  status: DocumentScanStatus;
  ocrResult: OCRResult;
  imageUrl?: string;
  createdAt: number;
}

export interface KaderProfile extends UserProfile {
  districtName?: string;
  villageName?: string;
  level: number;
  memberCount: number;
  verifiedCount: number;
  targets?: KaderTarget[];
  trainingHistory?: TrainingRecord[];
}

// ---- Google Sheets Integration ----

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  columns: SheetColumnMapping[];
  lastSyncAt?: number;
}

export interface SheetColumnMapping {
  sheetHeader: string; // Header text in Google Sheet (e.g. "Nama Lengkap")
  memberField: string;  // Field name in Member type (e.g. "name")
}

export type SyncDirection = 'export' | 'import';
export type SyncStatus = 'pending' | 'running' | 'success' | 'error';

export interface SyncRecord {
  syncId: string;
  userId: string;
  direction: SyncDirection;
  status: SyncStatus;
  spreadsheetId: string;
  sheetName: string;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
  duration?: number;
}

export interface SheetRow {
  [key: string]: string;
}

