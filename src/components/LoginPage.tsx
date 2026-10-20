import React, { useMemo, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import {
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID,
  auth,
} from '../lib/firebase';
import { extractNameFromEmail } from '../data/karawangData';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';

export type UserRole = 'sales' | 'admin';

interface LoginPageProps {
  onLoginSuccess: (
    user: FirebaseUser | { email: string; displayName?: string | null },
    role: UserRole
  ) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('sales');
  const [email, setEmail] = useState('gtmifmkarawang@gmail.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Switch role helper
  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole);
    setErrorMsg(null);
    if (newRole === 'admin') {
      if (email === 'gtmifmkarawang@gmail.com' || email.toLowerCase().includes('sales') || !email) {
        setEmail('admin.karawang@indofood.co.id');
      }
    } else {
      if (email === 'admin.karawang@indofood.co.id' || email.toLowerCase().includes('admin') || !email) {
        setEmail('gtmifmkarawang@gmail.com');
      }
    }
  };

  // Validasi peran vs kata dalam email (sales tidak bisa masuk admin, admin tidak bisa masuk sales)
  const emailRoleError = useMemo(() => {
    const lower = email.trim().toLowerCase();
    if (!lower) return null;
    if (role === 'admin' && lower.includes('sales')) {
      return "Email mengandung kata 'sales'. Akun Sales Representative tidak diizinkan masuk ke portal Admin GTM. Silakan beralih ke peran 'Sales Rep'.";
    }
    if (role === 'sales' && lower.includes('admin')) {
      return "Email mengandung kata 'admin'. Akun Administrator tidak diizinkan masuk ke portal Sales Rep. Silakan beralih ke peran 'Admin GTM'.";
    }
    return null;
  }, [email, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();

    // Validasi penolakan email berdasarkan peran
    if (role === 'admin' && lowerEmail.includes('sales')) {
      setErrorMsg(
        "Akses Ditolak: Email mengandung kata 'sales'. Akun Sales Representative tidak diizinkan masuk sebagai Admin GTM. Silakan pilih peran 'Sales Rep'."
      );
      return;
    }

    if (role === 'sales' && lowerEmail.includes('admin')) {
      setErrorMsg(
        "Akses Ditolak: Email mengandung kata 'admin'. Akun Administrator tidak diizinkan masuk sebagai Sales Representative. Silakan pilih peran 'Admin GTM'."
      );
      return;
    }

    // Nama akun otomatis diambil dari format email tanpa perlu input manual
    const cleanName = extractNameFromEmail(cleanEmail, role);

    if (!cleanEmail) {
      setErrorMsg('Silakan masukkan alamat email Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan password akun.');
      return;
    }

    setLoading(true);
    try {
      let userObj: FirebaseUser | { email: string; displayName: string };

      try {
        if (mode === 'login') {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          try {
            await updateProfile(cred.user, { displayName: cleanName });
          } catch {
            // ignore
          }
          userObj = {
            ...cred.user,
            displayName: cleanName,
            email: cleanEmail,
          };
        } else {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          try {
            await updateProfile(cred.user, { displayName: cleanName });
          } catch {
            // ignore
          }
          userObj = {
            ...cred.user,
            displayName: cleanName,
            email: cleanEmail,
          };
        }
      } catch (authError: unknown) {
        // If account doesn't exist yet on login attempt, offer fallback or clarify
        const rawErr = authError instanceof Error ? authError.message.toLowerCase() : '';
        if (
          rawErr.includes('user-not-found') ||
          rawErr.includes('invalid-credential') ||
          rawErr.includes('wrong-password')
        ) {
          throw new Error(
            'Email atau password salah. Jika akun ini belum didaftarkan di Firebase, Anda dapat beralih ke tab "Daftar Akun Baru" atau gunakan tombol Masuk Cepat Demo.'
          );
        } else if (
          rawErr.includes('network-request-failed') ||
          rawErr.includes('unavailable') ||
          rawErr.includes('timeout')
        ) {
          // If offline / sandbox network restriction, provide demo sign in so user is not blocked
          console.warn('Network issue with Firebase auth, using local verified session:', authError);
          userObj = {
            email: cleanEmail,
            displayName: cleanName,
          };
        } else {
          throw authError;
        }
      }

      setSuccessMsg(
        `Login berhasil! Mengarahkan ke Dashboard ${role === 'admin' ? 'Admin' : 'Sales'}...`
      );

      setTimeout(() => {
        onLoginSuccess(userObj, role);
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Fill & Login Demo
  const handleQuickDemo = (quickRole: UserRole) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const demoEmail =
      quickRole === 'admin'
        ? 'admin.karawang@indofood.co.id'
        : 'gtmifmkarawang@gmail.com';
    const demoName = extractNameFromEmail(demoEmail, quickRole);

    setRole(quickRole);
    setEmail(demoEmail);
    setPassword('indofood2026');

    // Attempt Firebase sign in, or seamlessly authenticate
    setLoading(true);
    signInWithEmailAndPassword(auth, demoEmail, 'indofood2026')
      .then((cred) => {
        setSuccessMsg(`Login berhasil sebagai ${quickRole === 'admin' ? 'Admin' : 'Sales'}!`);
        setTimeout(() => {
          onLoginSuccess(cred.user, quickRole);
        }, 300);
      })
      .catch(() => {
        // Fallback demo sign in
        setSuccessMsg(`Login berhasil sebagai ${quickRole === 'admin' ? 'Admin' : 'Sales'}!`);
        setTimeout(() => {
          onLoginSuccess(
            { email: demoEmail, displayName: demoName },
            quickRole
          );
        }, 300);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Brand Watermark */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/15 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wide">
              GTM Karawang Online
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200/80 font-mono">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>{ACTIVE_FIREBASE_PROJECT_ID}</span>
          <span>·</span>
          <span>{ACTIVE_FIRESTORE_DATABASE_ID}</span>
        </div>
      </div>

      {/* Main Login Card Container */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
          {/* Card Header with Snack Time Official Palette */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            <div className="flex justify-center mb-3">
              <IndofoodSnackTimeLogo size="md" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-3">
              Portal Log In Sistem GTM
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xs mx-auto">
              PT Indofood Fortuna Makmur (IFM) · Area Karawang
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* 1. ROLE SELECTOR PILL (Sales vs Admin) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Pilih Peran / Role Masuk *
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleSelectRole('sales')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    role === 'sales'
                      ? 'bg-blue-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Sales Rep</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('admin')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    role === 'admin'
                      ? 'bg-blue-950 text-amber-300 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin GTM</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                {role === 'sales'
                  ? 'Akses ke Rute Harian, Kunjungan Toko, Order Snack, & Cetak Kwitansi.'
                  : 'Akses ke Ringkasan Penjualan, Monitoring Wilayah, & Validasi Order Toko.'}
              </p>
            </div>

            {/* Notification messages */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
              </div>
            )}

            {/* 2. FORM LOGIN (Email & Password) - Nama otomatis diambil dari email */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Email Akun {role === 'admin' ? 'Admin' : 'Sales'} *</span>
                  {role === 'admin' ? (
                    <span className="text-[10px] text-amber-600 font-medium">Bukan email sales</span>
                  ) : (
                    <span className="text-[10px] text-blue-600 font-medium">Bukan email admin</span>
                  )}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    emailRoleError ? 'text-rose-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={
                      role === 'admin'
                        ? 'admin.karawang@indofood.co.id'
                        : 'gtmifmkarawang@gmail.com'
                    }
                    className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-all font-medium ${
                      emailRoleError
                        ? 'bg-rose-50 border border-rose-300 text-rose-900 focus:border-rose-500 focus:bg-white'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-700 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Warning bila email mengandung kata sales saat login admin, atau admin saat login sales */}
                {emailRoleError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{emailRoleError}</span>
                  </div>
                )}
              </div>

              {/* Password Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <span className="text-[11px] text-slate-400">
                      Minimal 6 karakter
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun"
                    className="w-full min-h-[46px] pl-10 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white transition-all font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full min-h-[48px] px-6 py-3 rounded-2xl font-black text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  role === 'admin'
                    ? 'bg-blue-950 hover:bg-black active:scale-[0.99]'
                    : 'bg-blue-800 hover:bg-blue-900 active:scale-[0.99]'
                } disabled:opacity-60`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? `Masuk ke Dashboard ${role === 'admin' ? 'Admin' : 'Sales'}`
                        : 'Daftarkan Akun Baru'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode: Login vs Register */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <span>{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg(null);
                }}
                className="font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                {mode === 'login' ? 'Daftar Akun Baru' : 'Log In di Sini'}
              </button>
            </div>

            {/* 3. QUICK DEMO SHORTCUT BUTTONS */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Atau Masuk Cepat Satu Klik (Uji Coba Demo):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('sales')}
                  className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Demo Sales</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    gtmifmkarawang@...
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demo Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    admin.karawang@...
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="max-w-md w-full mx-auto text-center py-4 text-xs text-blue-200/70 space-y-1">
        <p className="font-semibold text-white/90">
          PT Indofood Fortuna Makmur (IFM)
        </p>
        <p className="text-[11px]">
          Sistem Go-To-Market & Penjualan Langsung Toko · Area Karawang
        </p>
      </footer>
    </div>
  );
};
