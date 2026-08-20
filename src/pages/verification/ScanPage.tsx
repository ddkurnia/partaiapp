import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  processKTPImage,
  preprocessImage,
  imageToDataUrl,
  saveScanRecord,
  getScanHistory,
  getConfidenceLabel,
  getFilledFieldCount,
} from '@/services/ocr/ocrService';
import type { OCRResult, KTPData, DocumentScan } from '@/types';
import {
  Camera, Upload, RotateCcw, ChevronRight, Check, AlertTriangle,
  FileText, Loader2, Eye, Clock, Zap, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 'capture' | 'processing' | 'result' | 'history';

const EDITABLE_FIELDS: { key: keyof KTPData; label: string; type?: string; placeholder: string }[] = [
  { key: 'nik', label: 'NIK', placeholder: '16 digit NIK' },
  { key: 'name', label: 'Nama Lengkap', placeholder: 'Nama sesuai KTP' },
  { key: 'birthPlace', label: 'Tempat Lahir', placeholder: 'Kota/Kabupaten' },
  { key: 'birthDate', label: 'Tanggal Lahir', type: 'date', placeholder: '' },
  { key: 'gender', label: 'Jenis Kelamin', placeholder: '' },
  { key: 'address', label: 'Alamat', placeholder: 'Alamat lengkap' },
  { key: 'rt', label: 'RT', placeholder: '001' },
  { key: 'rw', label: 'RW', placeholder: '001' },
  { key: 'kelurahan', label: 'Kel/Desa', placeholder: 'Nama kelurahan' },
  { key: 'kecamatan', label: 'Kecamatan', placeholder: 'Nama kecamatan' },
  { key: 'agama', label: 'Agama', placeholder: 'Agama' },
  { key: 'statusPerkawinan', label: 'Status Kawin', placeholder: 'Belum Kawin' },
  { key: 'pekerjaan', label: 'Pekerjaan', placeholder: 'Pekerjaan' },
  { key: 'kewarganegaraan', label: 'Kewarganegaraan', placeholder: 'WNI' },
];

export default function ScanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/members/new';

  const [step, setStep] = useState<Step>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editableData, setEditableData] = useState<Partial<KTPData>>({});
  const [progress, setProgress] = useState(0);
  const [scanHistory, setScanHistory] = useState<DocumentScan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [activeTab, setActiveTab] = useState<'utama' | 'lainnya'>('utama');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load scan history on mount
  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  async function loadHistory() {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await getScanHistory(user.uid, 20);
      setScanHistory(history);
    } catch { /* silent */ }
    setLoadingHistory(false);
  }

  // Handle file selection (camera or upload)
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Format file tidak didukung. Gunakan gambar (JPG/PNG).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar (maks 20MB).');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStep('processing');
    setProgress(0);
    setOcrResult(null);

    try {
      // Preprocess image for better OCR
      const processedImg = await preprocessImage(file);
      const result = await processKTPImage(processedImg, setProgress);

      // Save scan record
      if (user) {
        try {
          const thumb = await imageToDataUrl(file, 400);
          await saveScanRecord(user.uid, result, 'ktp', thumb);
          loadHistory(); // refresh history
        } catch { /* non-critical */ }
      }

      setOcrResult(result);
      setEditableData({ ...result.ktpData });
      setStep('result');
    } catch {
      toast.error('Gagal memproses gambar. Coba lagi dengan foto yang lebih jelas.');
      setStep('capture');
      setImagePreview('');
      setImageFile(null);
    }
  }, [user]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  }

  function handleReset() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setOcrResult(null);
    setEditableData({});
    setProgress(0);
    setShowRawText(false);
    setActiveTab('utama');
    setStep('capture');
  }

  function updateField(key: keyof KTPData, value: string) {
    setEditableData(prev => ({ ...prev, [key]: value }));
  }

  // Navigate to member form with OCR data
  function handleUseData() {
    if (!editableData.nik && !editableData.name) {
      toast.error('Minimal NIK atau Nama harus terisi untuk melanjutkan.');
      return;
    }

    // Store in sessionStorage for member form to pick up
    const formData: Record<string, string> = {};
    if (editableData.nik) formData.nik = editableData.nik;
    if (editableData.name) formData.name = editableData.name;
    if (editableData.birthPlace) formData.birthPlace = editableData.birthPlace;
    if (editableData.birthDate) formData.birthDate = editableData.birthDate;
    if (editableData.gender) formData.gender = editableData.gender;
    if (editableData.address) formData.address = editableData.address;

    sessionStorage.setItem('ocr_member_data', JSON.stringify(formData));
    navigate(redirectPath);
  }

  // Reuse history scan data
  async function handleReuseScan(scan: DocumentScan) {
    setOcrResult(scan.ocrResult);
    setEditableData({ ...scan.ocrResult.ktpData });
    setImagePreview(scan.imageUrl || '');
    setStep('result');
  }

  const mainFields = EDITABLE_FIELDS.filter(f => ['nik', 'name', 'birthPlace', 'birthDate', 'gender', 'address'].includes(f.key));
  const otherFields = EDITABLE_FIELDS.filter(f => !['nik', 'name', 'birthPlace', 'birthDate', 'gender', 'address'].includes(f.key));
  const activeFields = activeTab === 'utama' ? mainFields : otherFields;
  const { filled, total } = ocrResult ? getFilledFieldCount(ocrResult.ktpData) : { filled: 0, total: 14 };
  const confidenceInfo = ocrResult ? getConfidenceLabel(ocrResult.confidence) : null;

  // ---- RENDER ----

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Scan KTP</h2>
          <p className="text-sm text-muted-foreground">OCR otomatis untuk pendataan anggota</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setStep(step === 'history' ? 'capture' : 'history'); if (step !== 'history') loadHistory(); }}
            className={`btn-outline h-10 px-3 text-sm flex items-center gap-1.5 ${step === 'history' ? 'bg-accent/10 border-accent text-accent' : ''}`}
          >
            <Clock className="w-4 h-4" /> Riwayat
          </button>
        </div>
      </div>

      {/* CAPTURE STEP */}
      {step === 'capture' && (
        <>
          <div className="card p-6 lg:p-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Unggah Foto KTP</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Ambil foto atau unggah gambar KTP. Sistem akan membaca data secara otomatis menggunakan OCR.
                </p>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 text-left max-w-md mx-auto">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Tips untuk hasil terbaik
                </p>
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                  <li>• Pastikan foto KTP jelas dan tidak buram</li>
                  <li>• Hindari cahaya yang terlalu terang atau gelap</li>
                  <li>• Foto seluruh bagian KTP dalam satu frame</li>
                  <li>• Gunakan kamera belakang untuk kualitas lebih baik</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
                >
                  <Camera className="w-5 h-5" /> Ambil Foto
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-outline flex items-center justify-center gap-2 px-6 py-3"
                >
                  <Upload className="w-5 h-5" /> Pilih File
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>
        </>
      )}

      {/* PROCESSING STEP */}
      {step === 'processing' && (
        <div className="card p-6 lg:p-8">
          <div className="text-center space-y-4">
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl object-contain mx-auto border border-border" />
              </div>
            )}
            <div>
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Memproses KTP...</h3>
              <p className="text-sm text-muted-foreground mt-1">Membaca teks dari gambar</p>
            </div>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{progress}% selesai</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Pertama kali mungkin perlu mengunduh data bahasa (~15MB).<br />
              Proses selanjutnya akan lebih cepat.
            </p>
          </div>
        </div>
      )}

      {/* RESULT STEP */}
      {step === 'result' && ocrResult && (
        <>
          {/* Status Bar */}
          <div className={`card p-3.5 flex items-center gap-3 ${
            ocrResult.success ? (filled >= 8 ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10') : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              ocrResult.success ? (filled >= 8 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600') : 'bg-red-500/10 text-red-600'
            }`}>
              {ocrResult.success ? (filled >= 8 ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />) : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${
                ocrResult.success ? (filled >= 8 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300') : 'text-red-700 dark:text-red-300'
              }`}>
                {ocrResult.success ? (filled >= 8 ? 'Data berhasil dibaca' : 'Sebagian data terbaca') : 'Gagal membaca data'}
              </p>
              <p className="text-xs text-muted-foreground">
                {filled}/{total} field terisi
                {confidenceInfo && ` · Akurasi: ${ocrResult.confidence}% (${confidenceInfo.label})`}
                {' '}&middot; {ocrResult.processingTime / 1000}s
              </p>
            </div>
          </div>

          {/* Image Preview + Raw Text Toggle */}
          {imagePreview && (
            <div className="card overflow-hidden">
              <div className="relative">
                <img src={imagePreview} alt="KTP" className="w-full max-h-56 object-contain bg-muted" />
              </div>
              <div className="px-3.5 py-2 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> {showRawText ? 'Sembunyikan' : 'Lihat'} Teks Mentah
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {ocrResult.rawText.length} karakter dikenali
                </span>
              </div>
              {showRawText && (
                <div className="px-3.5 pb-3 border-t border-border">
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono mt-2 max-h-32 overflow-y-auto scrollbar-thin">
                    {ocrResult.rawText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Editable Fields */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex gap-1">
                {(['utama', 'lainnya'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-accent text-white'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {tab === 'utama' ? 'Data Utama' : 'Lainnya'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-3">
              {activeFields.map(field => {
                const value = (editableData[field.key] || '') as string;
                const isEmpty = !value || value.trim() === '';

                if (field.key === 'gender') {
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">{field.label}</label>
                      <div className="flex gap-3">
                        {(['L', 'P'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateField('gender', g)}
                            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                              editableData.gender === g
                                ? 'border-accent bg-accent/10 text-accent'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">
                      {field.label}
                      {isEmpty && <span className="text-xs text-muted-foreground font-normal ml-1">(kosong)</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={value}
                      onChange={e => updateField(field.key, e.target.value)}
                      className={`input-field ${isEmpty ? 'border-dashed opacity-60' : ''}`}
                      placeholder={field.placeholder}
                      inputMode={field.key === 'nik' ? 'numeric' : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-outline flex-1 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Scan Ulang
            </button>
            <button onClick={handleUseData} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" /> Gunakan Data
            </button>
          </div>
        </>
      )}

      {/* HISTORY STEP */}
      {step === 'history' && (
        <>
          {loadingHistory ? (
            <div className="card p-8 text-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
            </div>
          ) : scanHistory.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-primary">Belum ada riwayat scan</h3>
              <p className="text-sm text-muted-foreground mt-1">Hasil pemindaian KTP akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scanHistory.map(scan => {
                const { filled: f } = getFilledFieldCount(scan.ocrResult.ktpData);
                const conf = getConfidenceLabel(scan.ocrResult.confidence);
                const timeAgo = getTimeAgo(scan.createdAt);
                return (
                  <button
                    key={scan.scanId}
                    onClick={() => handleReuseScan(scan)}
                    className="card p-3 w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow"
                  >
                    {scan.imageUrl ? (
                      <img src={scan.imageUrl} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-14 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary truncate">
                          {scan.ocrResult.ktpData.name || 'Tidak terbaca'}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          scan.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : scan.status === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {f}/14
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{scan.ocrResult.ktpData.nik || '-'}</span>
                        <span>&middot;</span>
                        <span>{conf.label} ({scan.ocrResult.confidence}%)</span>
                        <span>&middot;</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => setStep('capture')} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <Camera className="w-4 h-4" /> Scan Baru
          </button>
        </>
      )}
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return `${Math.floor(days / 7)} minggu lalu`;
}
