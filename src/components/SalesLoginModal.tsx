import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import {
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID,
  auth,
  db,
} from '../lib/firebase';
import { extractNameFromEmail } from '../data/karawangData';

interface SalesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onLoginSuccess?: (user: FirebaseUser) => void;
}

export const SalesLoginModal: React.FC<SalesLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('gtmifmkarawang@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live test Firestore state
  const [testTesting, setTestTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    products?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Silakan masukkan email akun sales.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan password.');
      return;
    }

    setLoading(true);
    try {
      let userCred;
      const derivedName = extractNameFromEmail(cleanEmail, 'sales');
      if (mode === 'login') {
        userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        try {
          if (!userCred.user.displayName) {
            await updateProfile(userCred.user, { displayName: derivedName });
          }
        } catch {
          // ignore
        }
        setSuccessMsg(`Berhasil login sebagai ${userCred.user.email}!`);
      } else {
        userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await updateProfile(userCred.user, { displayName: derivedName });
        } catch {
          // ignore
        }
        setSuccessMsg(`Berhasil mendaftarkan dan login akun sales: ${userCred.user.email}!`);
      }

      setPassword('');
      if (onLoginSuccess && userCred.user) {
        onLoginSuccess(userCred.user);
      }
    } catch (err: unknown) {
      let friendlyMessage = 'Terjadi kesalahan saat proses login.';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (
          msg.includes('user-not-found') ||
          msg.includes('invalid-credential') ||
          msg.includes('wrong-password')
        ) {
          friendlyMessage =
            'Email atau password salah. Jika akun sales ini belum pernah dibuat di Firebase, silakan klik tab "Daftar Akun Baru" di atas.';
        } else if (msg.includes('invalid-email')) {
          friendlyMessage = 'Format email tidak valid. Pastikan penulisan email benar.';
        } else if (msg.includes('weak-password')) {
          friendlyMessage = 'Password terlalu pendek. Firebase mewajibkan minimal 6 karakter.';
        } else if (msg.includes('email-already-in-use')) {
          friendlyMessage =
            'Email ini sudah terdaftar. Silakan pilih tab "Log In Akun Sales" dan masukkan password akun.';
        } else if (msg.includes('network-request-failed')) {
          friendlyMessage = 'Gagal terhubung ke Firebase. Periksa koneksi internet Anda.';
        } else {
          friendlyMessage = err.message;
        }
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      setSuccessMsg(`Berhasil login dengan Google: ${res.user.email}!`);
      if (onLoginSuccess && res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In dibatalkan atau gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    setTestResult(null);
    setLoading(true);
    try {
      await signOut(auth);
      setSuccessMsg('Berhasil logout dari akun sales.');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal logout.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestFirestoreRead = async () => {
    setTestTesting(true);
    setTestResult(null);
    try {
      const snap = await getDocs(collection(db, 'Product'));
      const productNames: string[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return (
          (typeof d.namaProduct === 'string' && d.namaProduct.trim()) ||
          (typeof d.name === 'string' && d.name) ||
          (typeof d.nama === 'string' && d.nama) ||
          docSnap.id
        );
      });

      setTestResult({
        success: true,
        message: `Koneksi Firestore OK! Berhasil membaca ${snap.docs.length} dokumen dari /Product.`,
        products: productNames,
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Gagal membaca collection /Product';
      const friendlyMsg =
        rawMsg.includes('Could not reach Cloud Firestore backend') ||
        rawMsg.includes('offline')
          ? 'Backend Firestore belum merespons dalam 10 detik. Client beralih ke mode offline (koneksi jaringan/proxy tertahan).'
          : rawMsg;
      setTestResult({
        success: false,
        message: friendlyMsg,
      });
    } finally {
      setTestTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {currentUser ? 'Akun Sales Sedang Aktif' : 'Test Log In Akun Sales'}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Project: {ACTIVE_FIREBASE_PROJECT_ID}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* If already logged in, show current session details & test options */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Terotentikasi di Firebase</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-700 font-mono bg-white p-3 rounded-lg border border-teal-100">
                  <p>
                    <span className="text-slate-500 font-sans">Email: </span>
                    <strong className="text-slate-900">{currentUser.email || '(Google Auth)'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-sans">UID: </span>
                    <span className="text-slate-600 truncate">{currentUser.uid}</span>
                  </p>
                  <p>
                    <span className="text-slate-500 font-sans">Project ID: </span>
                    <span className="text-teal-700 font-semibold">{ACTIVE_FIREBASE_PROJECT_ID}</span>
                  </p>
                  <p>
                    <span className="text-slate-500 font-sans">Database: </span>
                    <span className="text-slate-700 font-semibold">{ACTIVE_FIRESTORE_DATABASE_ID}</span>
                  </p>
                </div>
                <p className="text-xs text-teal-800">
                  Akun sales ini siap mencatat kunjungan toko, purchase order, dan membaca katalog produk.
                </p>
              </div>

              {/* Firestore Read Test Tool */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-teal-700" />
                    <span>Uji Izin Akses Firestore</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTestFirestoreRead}
                    disabled={testTesting}
                    className="px-2.5 py-1 rounded-lg bg-teal-700 text-white text-[11px] font-semibold hover:bg-teal-800 disabled:opacity-60 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${testTesting ? 'animate-spin' : ''}`} />
                    <span>{testTesting ? 'Menguji...' : 'Test Baca /Product'}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      testResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.products && testResult.products.length > 0 && (
                      <div className="mt-2 space-y-1 pt-1.5 border-t border-emerald-200/60 font-sans">
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          Produk yang terbaca:
                        </p>
                        <ul className="list-disc list-inside text-[11px] text-emerald-900 space-y-0.5">
                          {testResult.products.map((p, idx) => (
                            <li key={idx}>
                              <strong>{p}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout / Ganti Akun</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 text-xs font-bold transition-colors shadow-xs"
                >
                  Lanjut ke Aplikasi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs: Log In vs Daftar Akun Baru */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Log In Akun Sales
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daftar Akun Baru
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <p>
                  {mode === 'login'
                    ? 'Masukkan email dan password akun sales yang terdaftar di Firebase.'
                    : 'Daftarkan email baru untuk sales representative baru ke Firebase Authentication.'}
                </p>
              </div>

              {/* Quick autofill helper button */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Pilihan cepat:</span>
                <button
                  type="button"
                  onClick={() => setEmail('gtmifmkarawang@gmail.com')}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-[11px] font-mono text-slate-700 transition-colors border border-slate-200"
                >
                  gtmifmkarawang@gmail.com
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Akun Sales
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. gtmifmkarawang@gmail.com"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white text-slate-900"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400">Minimal 6 karakter</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'login' ? 'Masukkan password' : 'Buat password baru'}
                      className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 min-h-[30px] min-w-[30px] flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? 'Sedang Memproses...'
                      : mode === 'login'
                      ? 'Log In Akun Sales'
                      : 'Daftar & Log In Sekarang'}
                  </span>
                </button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium">
                    atau alternatif
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Masuk dengan Akun Google (Popup)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
