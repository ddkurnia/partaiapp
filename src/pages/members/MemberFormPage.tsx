import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createMember, checkDuplicate, type DuplicateCheck } from '@/services/members/memberService';
import { getDistrictOptions, getVillageOptions } from '@/constants/regions';
import type { Member } from '@/types';
import { Save, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  nik: string;
  birthPlace: string;
  birthDate: string;
  gender: Member['gender'];
  address: string;
  phone: string;
  districtId: string;
  villageId: string;
}

const INITIAL: FormData = {
  name: '', nik: '', birthPlace: '', birthDate: '',
  gender: 'L', address: '', phone: '',
  districtId: '', villageId: '',
};

interface FormErrors {
  [key: string]: string;
}

export default function MemberFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateCheck | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [forceSave, setForceSave] = useState(false);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!form.nik.trim()) e.nik = 'NIK wajib diisi';
    else if (!/^\d{16}$/.test(form.nik.trim())) e.nik = 'NIK harus 16 digit angka';
    if (!form.birthPlace.trim()) e.birthPlace = 'Tempat lahir wajib diisi';
    if (!form.birthDate) e.birthDate = 'Tanggal lahir wajib diisi';
    if (!form.districtId) e.districtId = 'Kecamatan wajib dipilih';
    if (!form.villageId) e.villageId = 'Desa/Kelurahan wajib dipilih';
    if (form.phone && !/^\+?\d{8,15}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      e.phone = 'Format telepon tidak valid';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCheckDuplicate = async () => {
    if (!form.nik || !form.districtId || !form.birthDate) return;
    try {
      const result = await checkDuplicate({
        name: form.name,
        nik: form.nik,
        birthDate: form.birthDate,
        districtId: form.districtId,
        villageId: form.villageId,
      });
      if (result.isDuplicate) {
        setDuplicate(result);
        setShowDuplicateWarning(true);
      } else {
        setDuplicate(null);
        setShowDuplicateWarning(false);
        await doSave();
      }
    } catch {
      await doSave(); // If duplicate check fails, proceed
    }
  };

  const doSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await createMember(
        {
          name: form.name.trim(),
          nikHash: form.nik.trim(),
          nikMasked: form.nik.trim().replace(/\d(?=\d{4})/g, '*'),
          birthPlace: form.birthPlace.trim(),
          birthDate: form.birthDate,
          gender: form.gender,
          address: form.address.trim(),
          phone: form.phone.trim(),
          districtId: form.districtId,
          villageId: form.villageId,
          status: 'active',
          verificationStatus: 'pending',
        },
        user.uid,
      );
      toast.success('Anggota berhasil ditambahkan');
      navigate('/members');
    } catch (err) {
      toast.error('Gagal menyimpan data. Periksa koneksi internet.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (forceSave) {
      await doSave();
    } else {
      setForceSave(false);
      await handleCheckDuplicate();
    }
  };

  const setField = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    if (field === 'districtId') {
      setForm(f => ({ ...f, villageId: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-primary">Tambah Anggota</h2>
          <p className="text-sm text-muted-foreground">Isi data anggota baru</p>
        </div>
      </div>

      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicate && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                DATA MIRIP DITEMUKAN — Kemungkinan duplikat: {duplicate.confidence}%
              </h4>
              {duplicate.matches.slice(0, 3).map((m, i) => (
                <div key={i} className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-2.5">
                  <p className="font-medium">{m.name}</p>
                  <p>NIK: {m.nikMasked}</p>
                  <p>TTL: {m.birthPlace}, {m.birthDate}</p>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowDuplicateWarning(false); setForceSave(true); }} className="btn-primary text-xs py-2">
                  Tetap Simpan
                </button>
                <button onClick={() => setShowDuplicateWarning(false)} className="btn-outline text-xs py-2">
                  Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-5 lg:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Nama Lengkap" error={errors.name} required>
            <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} className="input-field" placeholder="Nama lengkap sesuai KTP" />
          </FieldGroup>

          <FieldGroup label="NIK" error={errors.nik} required>
            <input type="text" value={form.nik} onChange={e => setField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} className="input-field font-mono" placeholder="16 digit NIK" maxLength={16} inputMode="numeric" />
          </FieldGroup>

          <FieldGroup label="Tempat Lahir" error={errors.birthPlace} required>
            <input type="text" value={form.birthPlace} onChange={e => setField('birthPlace', e.target.value)} className="input-field" placeholder="Kota/Kabupaten" />
          </FieldGroup>

          <FieldGroup label="Tanggal Lahir" error={errors.birthDate} required>
            <input type="date" value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} className="input-field" />
          </FieldGroup>

          <FieldGroup label="Jenis Kelamin" required>
            <div className="flex gap-3">
              {(['L', 'P'] as const).map(g => (
                <button key={g} type="button" onClick={() => setField('gender', g)}
                  className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-all ${
                    form.gender === g
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}>
                  {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="No. Telepon" error={errors.phone}>
            <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} className="input-field" placeholder="08xxxxxxxxxx" inputMode="tel" />
          </FieldGroup>

          <FieldGroup label="Kecamatan" error={errors.districtId} required className="sm:col-span-1">
            <select value={form.districtId} onChange={e => setField('districtId', e.target.value)} className="input-field">
              <option value="">Pilih kecamatan</option>
              {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="Desa/Kelurahan" error={errors.villageId} required className="sm:col-span-1">
            <select value={form.villageId} onChange={e => setField('villageId', e.target.value)} className="input-field" disabled={!form.districtId}>
              <option value="">Pilih desa</option>
              {getVillageOptions(form.districtId).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="Alamat Lengkap" className="sm:col-span-2">
            <textarea value={form.address} onChange={e => setField('address', e.target.value)} className="input-field min-h-[80px] resize-y" placeholder="Alamat lengkap (opsional)" />
          </FieldGroup>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Batal</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldGroup({ label, error, required, children, className = '' }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-primary">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
