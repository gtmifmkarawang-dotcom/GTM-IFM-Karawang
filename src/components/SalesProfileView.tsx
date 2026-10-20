import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Award,
  Building,
  Check,
  CheckCircle2,
  Database,
  Edit2,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Target,
  User,
  X,
} from 'lucide-react';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';
import { extractNameFromEmail, formatIdr } from '../data/karawangData';
import {
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID,
} from '../lib/firebase';
import { SalesRepresentative } from '../types/gtm';

interface SalesProfileViewProps {
  salesRep: SalesRepresentative;
  currentUser: FirebaseUser | null;
  onOpenLoginModal: () => void;
  onOpenFirebaseSheet: () => void;
  onSignOut?: () => void;
  onUpdateName?: (newName: string) => void;
  totalVisitsCount: number;
  totalOrdersCount: number;
  totalSalesIdr: number;
}

export const SalesProfileView: React.FC<SalesProfileViewProps> = ({
  salesRep,
  currentUser,
  onOpenLoginModal,
  onOpenFirebaseSheet,
  onSignOut,
  onUpdateName,
  totalVisitsCount,
  totalOrdersCount,
  totalSalesIdr,
}) => {
  const currentEmail = currentUser?.email || salesRep.email || 'gtmifmkarawang@gmail.com';
  const currentName =
    salesRep.name ||
    currentUser?.displayName ||
    extractNameFromEmail(currentEmail, 'sales');

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(currentName);

  React.useEffect(() => {
    setEditedName(currentName);
  }, [currentName]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim() && onUpdateName) {
      onUpdateName(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-8">
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white shadow-xl border border-blue-700/50 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-blue-950 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border-2 border-white/30 shrink-0">
              {currentName.charAt(0)}
            </div>
            <div>
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mb-1.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-3 py-1 text-sm font-bold bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Masukkan Nama Sales"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                    title="Simpan Nama"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(currentName);
                      setIsEditingName(false);
                    }}
                    className="p-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                    title="Batal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {currentName}
                  </h1>
                  {onUpdateName && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-blue-200 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Ubah Nama"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-blue-950 uppercase tracking-wider">
                    {salesRep.role}
                  </span>
                </div>
              )}

              {/* Email Pengguna Sesuai Login (Tanpa ID Karyawan) */}
              <p className="text-xs text-blue-200 mt-1 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>{currentEmail}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {currentUser ? 'Akun Terautentikasi' : 'Mode Offline / Tamu'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Keluar (Log Out)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Target & Kinerja Harian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Target Kunjungan Harian
          </span>
          <p className="text-2xl font-black font-mono text-blue-950">
            {totalVisitsCount} / {salesRep.dailyVisitTarget} Toko
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Coverage Area Wilayah Karawang
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Realisasi Order
          </span>
          <p className="text-2xl font-black font-mono text-emerald-700">
            {totalOrdersCount} Transaksi
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Strike Rate: {totalVisitsCount > 0 ? Math.round((totalOrdersCount / totalVisitsCount) * 100) : 0}%
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Total Sales Hari Ini
          </span>
          <p className="text-xl font-black font-mono text-blue-950 truncate">
            {formatIdr(totalSalesIdr)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Target: {formatIdr(salesRep.dailyOrderTargetIdr)}
          </p>
        </div>
      </div>

      {/* Wilayah Penugasan Karawang */}
      <div className="p-6 rounded-3xl bg-white border border-blue-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-slate-100">
          <MapPin className="w-5 h-5 text-blue-700" />
          <h2 className="text-sm font-bold text-blue-950">
            Wilayah Penugasan (Area Karawang)
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Sebagai Sales Representative PT Indofood Fortuna Makmur (IFM), Anda ditugaskan mencakup toko kelontong, retail, grosir, dan minimarket di Area:
        </p>

        <div className="flex flex-wrap gap-2">
          {salesRep.assignedDistricts.map((district) => (
            <span
              key={district}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold"
            >
              {district}
            </span>
          ))}
        </div>
      </div>

      {/* Detail Firebase Project & Infrastruktur */}
      <div className="p-6 rounded-3xl bg-white border border-blue-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-blue-950">
              Integrasi Cloud Firestore
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenFirebaseSheet}
            className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
          >
            Periksa Koneksi
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Project ID:</span>
            <span className="font-mono font-semibold text-slate-800">{ACTIVE_FIREBASE_PROJECT_ID}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Database:</span>
            <span className="font-mono font-semibold text-slate-800">{ACTIVE_FIRESTORE_DATABASE_ID}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
