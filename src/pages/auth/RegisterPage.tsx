import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Eye, EyeOff, UserPlus, ArrowLeft, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      // Cek apakah sudah ada user di Firestore
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
      const isFirstUser = usersSnap.empty;
      const role = isFirstUser ? 'super_admin' : 'viewer';

      // Buat akun Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      // Buat profil di Firestore
      await setDoc(doc(db, 'users', credential.user.uid), {
        email,
        displayName: name,
        role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast.success(isFirstUser
        ? 'Akun Super Admin berhasil dibuat!'
        : 'Akun berhasil dibuat!'
      );
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar';
      if (msg.includes('email-already-in-use')) setError('Email sudah terdaftar');
      else if (msg.includes('invalid-email')) setError('Format email tidak valid');
      else if (msg.includes('weak-password')) setError('Password terlalu lemah (minimal 6 karakter)');
      else setError('Gagal mendaftar. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold text-primary">Buat Akun</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar untuk mulai menggunakan PartaiApp
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Akun <strong>pertama</strong> yang didaftarkan otomatis menjadi <strong className="text-accent">Super Admin</strong> dengan akses penuh.
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="email@contoh.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Konfirmasi Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="Ulangi password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email || !password || !confirmPassword}
            className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Daftar
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
