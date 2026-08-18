import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMember, updateMember } from '@/services/members/memberService';
import { getDistrictOptions, getVillageOptions } from '@/constants/regions';
import { useAuth } from '@/contexts/AuthContext';
import type { Member } from '@/types';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  birthPlace: string;
  birthDate: string;
  gender: Member['gender'];
  address: string;
  phone: string;
  districtId: string;
  villageId: string;
  status: Member['status'];
  verificationStatus: Member['verificationStatus'];
}

export default function MemberEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasMinRole } = useAuth();
  const [form, setForm] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canChangeStatus = hasMinRole('admin_kecamatan');
  const canChangeVerif = hasMinRole('admin_kecamatan');

  useEffect(() => {
    if (!id) return;
    getMember(id).then(m => {
      if (m) {
        setForm({
          name: m.name, birthPlace: m.birthPlace, birthDate: m.birthDate,
          gender: m.gender, address: m.address, phone: m.phone,
          districtId: m.districtId, villageId: m.villageId,
          status: m.status, verificationStatus: m.verificationStatus,
        });
      } else {
        toast.error('Anggota tidak ditemukan');
        navigate('/members');
      }
    }).catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const validate = () => {
    if (!form) return false;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!form.districtId) e.districtId = 'Kecamatan wajib';
    if (!form.villageId) e.villageId = 'Desa wajib';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !user || !id || !validate()) return;
    setSaving(true);
    try {
      await updateMember(id, {
        name: form.name.trim(), birthPlace: form.birthPlace.trim(),
        birthDate: form.birthDate, gender: form.gender,
        address: form.address.trim(), phone: form.phone.trim(),
        districtId: form.districtId, villageId: form.villageId,
        status: form.status, verificationStatus: form.verificationStatus,
      }, user.uid);
      toast.success('Data anggota diperbarui');
      navigate(`/members/${id}`);
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof FormData, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    if (field === 'districtId') setForm({ ...form, districtId: value, villageId: '' });
  };

  if (loading || !form) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-96 w-full skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-primary">Edit Anggota</h2>
          <p className="text-sm text-muted-foreground">Perbarui data {form.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 lg:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Nama Lengkap" error={errors.name} required>
            <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} className="input-field" />
          </FieldGroup>
          <FieldGroup label="Tempat Lahir" required>
            <input type="text" value={form.birthPlace} onChange={e => setField('birthPlace', e.target.value)} className="input-field" />
          </FieldGroup>
          <FieldGroup label="Tanggal Lahir" required>
            <input type="date" value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} className="input-field" />
          </FieldGroup>
          <FieldGroup label="Jenis Kelamin" required>
            <div className="flex gap-3">
              {(['L', 'P'] as const).map(g => (
                <button key={g} type="button" onClick={() => setField('gender', g)}
                  className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-all ${
                    form.gender === g ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}>
                  {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                </button>
              ))}
            </div>
          </FieldGroup>
          <FieldGroup label="No. Telepon">
            <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} className="input-field" inputMode="tel" />
          </FieldGroup>
          <FieldGroup label="Kecamatan" error={errors.districtId} required>
            <select value={form.districtId} onChange={e => setField('districtId', e.target.value)} className="input-field">
              <option value="">Pilih</option>
              {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Desa/Kelurahan" error={errors.villageId} required>
            <select value={form.villageId} onChange={e => setField('villageId', e.target.value)} className="input-field" disabled={!form.districtId}>
              <option value="">Pilih</option>
              {getVillageOptions(form.districtId).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </FieldGroup>
          {canChangeStatus && (
            <FieldGroup label="Status">
              <select value={form.status} onChange={e => setField('status', e.target.value)} className="input-field">
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="suspended">Ditangguhkan</option>
              </select>
            </FieldGroup>
          )}
          {canChangeVerif && (
            <FieldGroup label="Status Verifikasi">
              <select value={form.verificationStatus} onChange={e => setField('verificationStatus', e.target.value)} className="input-field">
                <option value="pending">Pending</option>
                <option value="verified">Terverifikasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </FieldGroup>
          )}
          <FieldGroup label="Alamat" className="sm:col-span-2">
            <textarea value={form.address} onChange={e => setField('address', e.target.value)} className="input-field min-h-[80px] resize-y" />
          </FieldGroup>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Batal</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
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