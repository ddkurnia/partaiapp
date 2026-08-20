import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  initGoogleAPI, signIn, signOut, isSignedIn, getUserName,
  getSheetsConfig, saveSheetsConfig, clearSheetsConfig,
  getSheetHeaders, exportToSheet, importFromSheet,
  extractSpreadsheetId, getSheetUrl, getDirectionLabel, getSyncHistory, saveSyncRecord,
  DEFAULT_COLUMNS,
} from '@/services/sheets/sheetsService';
import { getDistrictOptions, getVillageOptions } from '@/constants/regions';
import type { SheetConfig, SheetColumnMapping, SyncRecord } from '@/types';
import {
  Sheet, Download, LogOut, LogIn,
  ExternalLink, Loader2, Check, AlertTriangle,
  Clock, RefreshCw, Link2, Unlink,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'connect' | 'export' | 'import' | 'history';

export default function SheetsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('connect');
  const [signedIn, setSignedIn] = useState(false);
  const [googleUser, setGoogleUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [sheetName, setSheetName] = useState('Anggota');

  // Export state
  const [exportDistrict, setExportDistrict] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ rows: number } | null>(null);

  // Import state
  const [importDistrict, setImportDistrict] = useState('');
  const [importVillage, setImportVillage] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; errorMessages: string[] } | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);

  // History
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Column mapping
  const [columns, setColumns] = useState<SheetColumnMapping[]>(DEFAULT_COLUMNS);

  // Load saved state
  useEffect(() => {
    const savedConfig = getSheetsConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      setSpreadsheetInput(savedConfig.spreadsheetId);
      setSheetName(savedConfig.sheetName);
      if (savedConfig.columns?.length) setColumns(savedConfig.columns);
    }
    const savedClientId = localStorage.getItem('partaiapp_gclient_id');
    if (savedClientId) setClientId(savedClientId);
  }, []);

  const checkAuth = useCallback(() => {
    setSignedIn(isSignedIn());
    if (isSignedIn()) setGoogleUser(getUserName());
  }, []);

  useEffect(() => {
    checkAuth();
    const i = setInterval(checkAuth, 5000);
    return () => clearInterval(i);
  }, [checkAuth]);

  async function loadHistory() {
    if (!user) return;
    setLoadingHistory(true);
    try { setHistory(await getSyncHistory(user.uid)); } catch { /* */ }
    setLoadingHistory(false);
  }

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  // ---- Auth ----

  async function handleConnect() {
    if (!clientId.trim()) { toast.error('Masukkan Google Client ID'); return; }
    setLoading(true);
    try {
      const ok = await initGoogleAPI(clientId.trim());
      if (!ok) { toast.error('Gagal inisialisasi Google API'); setLoading(false); return; }
      localStorage.setItem('partaiapp_gclient_id', clientId.trim());
      await signIn();
      setSignedIn(true);
      setGoogleUser(getUserName());
      toast.success('Terhubung ke Google');
      setTab('export');
    } catch { toast.error('Gagal menghubungkan ke Google'); }
    finally { setLoading(false); }
  }

  function handleDisconnect() {
    signOut();
    setSignedIn(false);
    setGoogleUser('');
    toast.success('Koneksi Google terputus');
  }

  // ---- Config ----

  function handleSaveConfig() {
    const sid = extractSpreadsheetId(spreadsheetInput);
    if (!sid) { toast.error('Spreadsheet ID tidak valid'); return; }
    const newConfig: SheetConfig = { spreadsheetId: sid, sheetName: sheetName.trim() || 'Anggota', columns };
    saveSheetsConfig(newConfig);
    setConfig(newConfig);
    toast.success('Konfigurasi disimpan');
  }

  function handleClearConfig() {
    clearSheetsConfig();
    setConfig(null);
    setSpreadsheetInput('');
    toast.success('Konfigurasi dihapus');
  }

  // ---- Export ----

  async function handleExport() {
    if (!config || !user) return;
    setExporting(true);
    setExportResult(null);
    const t0 = Date.now();
    try {
      const result = await exportToSheet(config.spreadsheetId, config.sheetName, config.columns, exportDistrict || undefined);
      setExportResult(result);
      await saveSyncRecord({
        userId: user.uid, direction: 'export', status: 'success',
        spreadsheetId: config.spreadsheetId, sheetName: config.sheetName,
        totalRows: result.rows, processedRows: result.rows, errorRows: 0,
        startedAt: t0, completedAt: Date.now(), duration: Date.now() - t0,
      });
      toast.success(`${result.rows} baris diekspor`);
    } catch (err) {
      await saveSyncRecord({
        userId: user.uid, direction: 'export', status: 'error',
        spreadsheetId: config.spreadsheetId, sheetName: config.sheetName,
        totalRows: 0, processedRows: 0, errorRows: 0,
        errorMessage: err instanceof Error ? err.message : 'Gagal',
        startedAt: t0, completedAt: Date.now(), duration: Date.now() - t0,
      });
      toast.error('Gagal mengekspor. Periksa akses spreadsheet.');
    } finally { setExporting(false); }
  }

  // ---- Import ----

  async function handleLoadHeaders() {
    if (!config) return;
    setLoading(true);
    try {
      const headers = await getSheetHeaders(config.spreadsheetId, config.sheetName);
      if (headers.length === 0) { toast.error('Sheet kosong'); }
      else { setSheetHeaders(headers); toast.success(`${headers.length} kolom ditemukan`); }
    } catch { toast.error('Gagal membaca sheet. Periksa ID dan nama sheet.'); }
    finally { setLoading(false); }
  }

  async function handleImport() {
    if (!config || !user || !importDistrict) {
      toast.error('Pilih kecamatan tujuan impor');
      return;
    }
    setImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
    const t0 = Date.now();
    try {
      const result = await importFromSheet(
        config.spreadsheetId, config.sheetName, config.columns,
        user.uid, importDistrict, importVillage,
        (c, t) => setImportProgress({ current: c, total: t }),
      );
      setImportResult(result);
      await saveSyncRecord({
        userId: user.uid, direction: 'import', status: result.errors > 0 ? 'error' : 'success',
        spreadsheetId: config.spreadsheetId, sheetName: config.sheetName,
        totalRows: result.imported + result.errors, processedRows: result.imported, errorRows: result.errors,
        errorMessage: result.errorMessages.slice(0, 5).join('; '),
        startedAt: t0, completedAt: Date.now(), duration: Date.now() - t0,
      });
      toast.success(`${result.imported} anggota diimpor, ${result.errors} gagal`);
    } catch (err) {
      await saveSyncRecord({
        userId: user.uid, direction: 'import', status: 'error',
        spreadsheetId: config.spreadsheetId, sheetName: config.sheetName,
        totalRows: 0, processedRows: 0, errorRows: 0,
        errorMessage: err instanceof Error ? err.message : 'Gagal',
        startedAt: t0, completedAt: Date.now(), duration: Date.now() - t0,
      });
      toast.error('Gagal mengimpor');
    } finally { setImporting(false); }
  }

  function getTimeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'Baru saja';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-primary">Google Sheets</h2>
        <p className="text-sm text-muted-foreground">Ekspor dan impor data anggota via spreadsheet</p>
      </div>

      {/* Auth Status Banner */}
      <div className={`card p-3.5 flex items-center gap-3 ${signedIn ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${signedIn ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
          {signedIn ? <Link2 className="w-5 h-5 text-emerald-600" /> : <Unlink className="w-5 h-5 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${signedIn ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {signedIn ? `Terhubung${googleUser ? ` sebagai ${googleUser}` : ''}` : 'Belum terhubung ke Google'}
          </p>
          <p className="text-xs text-muted-foreground">
            {signedIn ? 'Akun Google aktif' : 'Hubungkan akun untuk mengakses Google Sheets'}
          </p>
        </div>
        {signedIn ? (
          <button onClick={handleDisconnect} className="btn-outline h-9 px-3 text-xs flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Putus
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([['connect', 'Koneksi'], ['export', 'Ekspor'], ['import', 'Impor'], ['history', 'Riwayat']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            disabled={key !== 'connect' && !signedIn}
            className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors ${
              tab === key ? 'bg-accent text-white' : signedIn || key === 'connect' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ---- CONNECT TAB ---- */}
      {tab === 'connect' && (
        <div className="card p-5 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-primary">Setup Google API</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Buat Google Client ID di{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-accent underline">
                Google Cloud Console
              </a>{' '}
              dengan redirect URI: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{window.location.origin}</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Google Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="xxxx.apps.googleusercontent.com"
            />
          </div>

          {!signedIn ? (
            <button
              onClick={handleConnect}
              disabled={loading || !clientId.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Menghubungkan...' : 'Hubungkan ke Google'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-primary mb-3">Konfigurasi Spreadsheet</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Spreadsheet ID / URL</label>
                    <input
                      type="text"
                      value={spreadsheetInput}
                      onChange={e => setSpreadsheetInput(e.target.value)}
                      className="input-field font-mono text-xs"
                      placeholder="URL atau ID spreadsheet Google"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Nama Sheet</label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={e => setSheetName(e.target.value)}
                      className="input-field"
                      placeholder="Anggota"
                    />
                  </div>
                  {config && (
                    <a
                      href={getSheetUrl(config.spreadsheetId)}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Buka spreadsheet di tab baru
                    </a>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveConfig} className="btn-primary flex-1">Simpan Konfigurasi</button>
                {config && (
                  <button onClick={handleClearConfig} className="btn-outline">Hapus</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- EXPORT TAB ---- */}
      {tab === 'export' && (
        <div className="card p-5 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-primary">Ekspor ke Google Sheets</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Kirim data anggota dari PartaiApp ke spreadsheet.
              {config && ` Target: ${config.sheetName}`}
            </p>
          </div>

          {!config && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
              Konfigurasi spreadsheet belum dibuat. Buka tab <strong>Koneksi</strong> terlebih dahulu.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Filter Kecamatan (opsional)</label>
            <select value={exportDistrict} onChange={e => setExportDistrict(e.target.value)} className="input-field">
              <option value="">Semua kecamatan</option>
              {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Kolom yang akan diekspor:</p>
            <p className="text-[10px] text-muted-foreground">
              {columns.map(c => c.sheetHeader).join(', ')}
            </p>
          </div>

          {exportResult && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {exportResult.rows} baris berhasil diekspor
              </span>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting || !config}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Mengekspor...' : 'Ekspor ke Spreadsheet'}
          </button>
        </div>
      )}

      {/* ---- IMPORT TAB ---- */}
      {tab === 'import' && (
        <div className="card p-5 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-primary">Impor dari Google Sheets</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Baca data dari spreadsheet dan buat anggota baru.
            </p>
          </div>

          <button onClick={handleLoadHeaders} disabled={loading || !config} className="btn-outline w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Membaca...' : 'Muat Header Sheet'}
          </button>

          {sheetHeaders.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Kolom yang ditemukan:</p>
              <div className="flex flex-wrap gap-1.5">
                {sheetHeaders.map((h, i) => (
                  <span key={i} className="text-[10px] bg-card border border-border rounded-md px-2 py-0.5">{h}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">Kecamatan Tujuan *</label>
              <select value={importDistrict} onChange={e => { setImportDistrict(e.target.value); setImportVillage(''); }} className="input-field">
                <option value="">Pilih kecamatan</option>
                {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">Desa Tujuan</label>
              <select value={importVillage} onChange={e => setImportVillage(e.target.value)} className="input-field" disabled={!importDistrict}>
                <option value="">Semua desa</option>
                {getVillageOptions(importDistrict).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {importing && (
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {importProgress.current}/{importProgress.total} baris diproses
              </p>
            </div>
          )}

          {importResult && (
            <div className={`rounded-xl p-3 space-y-2 ${importResult.errors > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'}`}>
              <div className="flex items-center gap-2">
                {importResult.errors > 0 ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
                <span className={`text-sm font-medium ${importResult.errors > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {importResult.imported} berhasil, {importResult.errors} gagal
                </span>
              </div>
              {importResult.errorMessages.length > 0 && (
                <div className="space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin">
                  {importResult.errorMessages.slice(0, 10).map((msg, i) => (
                    <p key={i} className="text-[10px] text-amber-600">{msg}</p>
                  ))}
                  {importResult.errorMessages.length > 10 && (
                    <p className="text-[10px] text-muted-foreground">...dan {importResult.errorMessages.length - 10} error lainnya</p>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || !config || !importDistrict}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
            {importing ? `Mengimpor... (${importProgress.current}/${importProgress.total})` : 'Impor dari Spreadsheet'}
          </button>
        </div>
      )}

      {/* ---- HISTORY TAB ---- */}
      {tab === 'history' && (
        <>
          {loadingHistory ? (
            <div className="card p-8 text-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-primary">Belum ada riwayat</h3>
              <p className="text-sm text-muted-foreground mt-1">Riwayat ekspor/impor akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(record => {
                const dirInfo = getDirectionLabel(record.direction);
                return (
                  <div key={record.syncId} className="card p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      record.status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {record.direction === 'export'
                        ? <Download className={`w-5 h-5 ${record.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
                        : <Sheet className={`w-5 h-5 ${record.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dirInfo.color}`}>
                          {dirInfo.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          record.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {record.status === 'success' ? 'Berhasil' : 'Gagal'}
                        </span>
                      </div>
                      <p className="text-xs text-primary mt-0.5 truncate">
                        {record.totalRows} baris · {record.processedRows} diproses
                        {record.errorRows > 0 && ` · ${record.errorRows} error`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {getTimeAgo(record.startedAt)}
                        {record.duration != null && ` · ${(record.duration / 1000).toFixed(1)}s`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
