import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      // error set in context
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Cek Email Anda</h1>
          <p className="text-sm text-muted-foreground">
            Kami telah mengirimkan tautan reset password ke <strong>{email}</strong>.
            Silakan periksa inbox atau folder spam Anda.
          </p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold text-primary">Lupa Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Masukkan email untuk menerima tautan reset password
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              className="input-field"
              placeholder="email@contoh.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Kirim Tautan Reset
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
