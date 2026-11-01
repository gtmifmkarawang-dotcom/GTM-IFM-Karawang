import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  FileText,
  Info,
  MapPin,
  Package,
  Plus,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import {
  calculateDailyTargetFromMonthly,
  extractNameFromEmail,
  formatIdr,
  getEffectiveWorkingDaysInMonth,
} from '../data/karawangData';
import {
  PlannedRouteStop,
  SalesRepresentative,
  Store,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';

interface SalesDashboardViewProps {
  salesRep: SalesRepresentative;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  visits: StoreVisit[];
  stores: Store[];
  routeStops: PlannedRouteStop[];
  selectedDate: string;
  onOpenVisitRecorder: (storeId?: string) => void;
  onNavigateSection: (section: 'visits' | 'orders' | 'profile' | 'stores') => void;
  onViewInvoice?: (visit: StoreVisit) => void;
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({
  salesRep,
  currentUserEmail,
  currentUserName,
  visits,
  stores,
  routeStops,
  selectedDate,
  onOpenVisitRecorder,
  onNavigateSection,
  onViewInvoice,
}) => {
  // Toggle antara tab performa 'HARI_INI' atau 'BULAN_INI'
  const [activePerformanceTab, setActivePerformanceTab] = useState<'HARI_INI' | 'BULAN_INI'>('HARI_INI');

  // 1. Tanggal hari ini secara otomatis dalam bahasa Indonesia
  const now = new Date();
  const autoDateIndonesian = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Waktu sapaan (Pagi/Siang/Sore/Malam)
  const currentHour = now.getHours();
  const timeGreeting =
    currentHour < 11
      ? 'Selamat Pagi'
      : currentHour < 15
      ? 'Selamat Siang'
      : currentHour < 18
      ? 'Selamat Sore'
      : 'Selamat Malam';

  // Sapaan menggunakan nama sales yang otomatis diambil dari email
  const displayName =
    currentUserName ||
    salesRep.name ||
    extractNameFromEmail(currentUserEmail || salesRep.email || '', 'sales');

  const quoteText =
    'Bekerja dengan hati melahirkan prestasi, bekerja dengan ikhlas membawa keberkahan';

  // Resolusi Tanggal & Prefix Bulan Ini
  const todayDateStr = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return selectedDate;
    }
    return now.toISOString().split('T')[0];
  }, [selectedDate]);

  const currentMonthPrefix = useMemo(() => {
    return todayDateStr.slice(0, 7); // 'YYYY-MM'
  }, [todayDateStr]);

  // Perhitungan Hari Efektif Kerja Bulan Ini (Senin - Sabtu, Minggu Libur)
  const effectiveDaysInfo = useMemo(() => {
    return getEffectiveWorkingDaysInMonth(todayDateStr);
  }, [todayDateStr]);

  // Target Bulanan & Target Harian (terisi otomatis dari rumus target bulanan / hari efektif)
  const monthlyOrderTargetIdr = useMemo(() => {
    return (
      salesRep.monthlyOrderTargetIdr ||
      (salesRep.dailyOrderTargetIdr
        ? salesRep.dailyOrderTargetIdr * effectiveDaysInfo.effectiveWorkingDays
        : 60000000)
    );
  }, [salesRep.monthlyOrderTargetIdr, salesRep.dailyOrderTargetIdr, effectiveDaysInfo.effectiveWorkingDays]);

  const dailyOrderTargetIdr = useMemo(() => {
    return calculateDailyTargetFromMonthly(
      monthlyOrderTargetIdr,
      effectiveDaysInfo.effectiveWorkingDays
    );
  }, [monthlyOrderTargetIdr, effectiveDaysInfo.effectiveWorkingDays]);

  const dailyVisitTarget = salesRep.dailyVisitTarget || 25;
  const monthlyVisitTarget = salesRep.monthlyVisitTarget || dailyVisitTarget * effectiveDaysInfo.effectiveWorkingDays;

  // Filter kunjungan Hari Ini vs Bulan Ini (sudah diisolasi untuk akun sales yang aktif)
  const todayVisits = useMemo(() => {
    return visits.filter((v) => v.date === todayDateStr);
  }, [visits, todayDateStr]);

  const monthVisits = useMemo(() => {
    return visits.filter((v) => v.date && v.date.startsWith(currentMonthPrefix));
  }, [visits, currentMonthPrefix]);

  // Helper kalkulasi metrik finansial
  const computeFinancials = (visitList: StoreVisit[]) => {
    const visitsCount = visitList.length;
    const orderVisits = visitList.filter(
      (v) => v.outcome === VisitOutcome.ORDER && v.purchaseOrder
    );
    const noOrderVisits = visitList.filter(
      (v) => v.outcome === VisitOutcome.NO_ORDER
    );
    const ordersCount = orderVisits.length;
    const noOrdersCount = noOrderVisits.length;

    // Total Penjualan Faktur Toko
    const storeSales = orderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      return acc + (po.totalStoreAmountIdr ?? po.netAmountIdr);
    }, 0);

    // Total HPP Perusahaan
    const companySales = orderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      if (po.totalCompanyAmountIdr) return acc + po.totalCompanyAmountIdr;
      return (
        acc +
        po.items.reduce(
          (sum, item) => sum + (item.companyPriceIdr ?? item.unitPriceIdr) * item.quantity,
          0
        )
      );
    }, 0);

    // Total Retur Toko
    const returnAmount = visitList.reduce((acc, v) => {
      if (v.totalReturnAmountIdr) return acc + v.totalReturnAmountIdr;
      if (v.purchaseOrder?.totalReturnAmountIdr) return acc + v.purchaseOrder.totalReturnAmountIdr;
      if (v.returns) {
        return acc + v.returns.reduce((sum, r) => sum + (r.subtotalReturnIdr || 0), 0);
      }
      return acc;
    }, 0);

    // Sales Bersih Setelah Retur
    const netSales = Math.max(0, storeSales - returnAmount);

    // Selisih Harga Jual Toko vs HPP Pabrik (+ Margin atau - Tombok)
    const selisih = storeSales - companySales;

    return {
      visitsCount,
      ordersCount,
      noOrdersCount,
      storeSales,
      companySales,
      returnAmount,
      netSales,
      selisih,
    };
  };

  const dailyFin = useMemo(() => computeFinancials(todayVisits), [todayVisits]);
  const monthlyFin = useMemo(() => computeFinancials(monthVisits), [monthVisits]);

  // Persentase Pencapaian Target
  const dailyAchievementPercent = dailyOrderTargetIdr > 0
    ? Math.round((dailyFin.netSales / dailyOrderTargetIdr) * 100)
    : 0;

  const monthlyAchievementPercent = monthlyOrderTargetIdr > 0
    ? Math.round((monthlyFin.netSales / monthlyOrderTargetIdr) * 100)
    : 0;

  const dailyVisitPercent = Math.min(
    100,
    Math.round((dailyFin.visitsCount / dailyVisitTarget) * 100)
  );

  const monthlyVisitPercent = Math.min(
    100,
    Math.round((monthlyFin.visitsCount / monthlyVisitTarget) * 100)
  );

  const monthlyRemainingTarget = Math.max(0, monthlyOrderTargetIdr - monthlyFin.netSales);

  // Active view financials sesuai tab yang dipilih sales
  const activeFin = activePerformanceTab === 'HARI_INI' ? dailyFin : monthlyFin;
  const activeTargetSales = activePerformanceTab === 'HARI_INI' ? dailyOrderTargetIdr : monthlyOrderTargetIdr;
  const activePercent = activePerformanceTab === 'HARI_INI' ? dailyAchievementPercent : monthlyAchievementPercent;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white shadow-xl border border-blue-700/50 p-6 sm:p-8">
        {/* Decorative Golden & White Glow Orbs */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* 1. Hari & Tanggal Otomatis + Info Hari Kerja Efektif */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 shadow-2xs flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{autoDateIndonesian}</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-mono">
                {effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif Bulan Ini
              </span>
            </div>

            {/* 2. Sapaan dengan field Nama Sales */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                {timeGreeting}, <span className="text-amber-400">{displayName}</span>!
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{salesRep.role}</span>
                <span>·</span>
                <span className="text-blue-100">{salesRep.email}</span>
                <span>·</span>
                <span className="text-amber-300 font-mono">Area Karawang</span>
              </p>
            </div>

            {/* Kutipan Resmi IFM */}
            <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-blue-950/60 border border-blue-700/40 max-w-2xl">
              <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-blue-100 font-medium italic leading-relaxed">
                “{quoteText}”
              </p>
            </div>
          </div>

          {/* Action Buttons: Record Visit Toko */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenVisitRecorder()}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-blue-950 font-black text-sm tracking-wide shadow-lg hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 active:scale-95 transition-all flex items-center justify-center gap-2.5 border border-amber-200 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span className="uppercase text-xs sm:text-sm tracking-wider">
                Record Visit Toko
              </span>
            </button>

            <div className="flex items-center gap-2 text-xs text-blue-200 text-center md:text-right flex-wrap justify-center md:justify-end">
              <span>Target Hari Ini: <strong className="text-white font-mono">{formatIdr(dailyOrderTargetIdr)}</strong></span>
              <span>·</span>
              <span>Kunjungan: <strong className="text-white">{dailyVisitTarget} Toko</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PUSAT PEMANTAUAN TARGET & PERFORMA SALES (HARIAN & BULANAN)                 */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white border border-blue-100 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-base font-black text-blue-950">
                Pusat Target & Performa Sales
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau realisasi sales harian dan performa akumulasi bulanan terhadap target PT IFM
            </p>
          </div>

          {/* Toggle Switch: Hari Ini vs Bulan Ini */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActivePerformanceTab('HARI_INI')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activePerformanceTab === 'HARI_INI'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Target Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePerformanceTab('BULAN_INI')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activePerformanceTab === 'BULAN_INI'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Target Bulan Ini (MTD)</span>
            </button>
          </div>
        </div>

        {/* DUAL CARDS: Performa Harian vs Performa Bulanan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* KARTU 1: PERFORMA HARI INI */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              activePerformanceTab === 'HARI_INI'
                ? 'bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/50 border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200/90 hover:border-blue-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">
                  Target & Realisasi Hari Ini
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                Target: {formatIdr(dailyOrderTargetIdr)}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Sales Achievement Harian */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Realisasi Sales Bersih:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-blue-950">
                      {formatIdr(dailyFin.netSales)}
                    </span>
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      ({dailyAchievementPercent}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mt-1.5 border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dailyAchievementPercent >= 100
                        ? 'bg-emerald-500'
                        : dailyAchievementPercent >= 75
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-r from-amber-500 to-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, dailyAchievementPercent)}%` }}
                  />
                </div>
              </div>

              {/* Grid Mini Harian */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Kunjungan</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {dailyFin.visitsCount} <span className="text-[10px] font-normal text-slate-400">/ {dailyVisitTarget}</span>
                  </p>
                  <span className="text-[10px] text-blue-700 font-semibold">{dailyVisitPercent}% target</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Toko Beli</span>
                  <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                    {dailyFin.ordersCount} <span className="text-[10px] font-normal text-slate-400">Outlet</span>
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {dailyFin.visitsCount > 0 ? `${Math.round((dailyFin.ordersCount / dailyFin.visitsCount) * 100)}% strike` : '0%'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Retur Toko</span>
                  <p className="text-xs font-bold text-rose-700 font-mono mt-0.5 truncate">
                    {dailyFin.returnAmount > 0 ? `- ${formatIdr(dailyFin.returnAmount)}` : 'Rp 0'}
                  </p>
                  <span className="text-[10px] text-slate-400">pengurang omset</span>
                </div>
              </div>

              {/* Selisih Harian */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Selisih Harga Hari Ini:</span>
                <span
                  className={`font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                    dailyFin.selisih < 0
                      ? 'bg-rose-100 text-rose-800'
                      : dailyFin.selisih > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {dailyFin.selisih < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  ) : dailyFin.selisih > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : null}
                  <span>
                    {dailyFin.selisih >= 0 ? '+' : ''}
                    {formatIdr(dailyFin.selisih)}
                  </span>
                  <span className="text-[10px] font-normal">
                    {dailyFin.selisih < 0 ? '(Tombok)' : dailyFin.selisih > 0 ? '(Margin)' : '(Impas)'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* KARTU 2: PERFORMA BULAN INI (MTD) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              activePerformanceTab === 'BULAN_INI'
                ? 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white border-slate-200/90 hover:border-indigo-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">
                  Target & Performa Bulan Ini ({effectiveDaysInfo.monthName})
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                Target: {formatIdr(monthlyOrderTargetIdr)}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Sales Achievement Bulanan */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Akumulasi Realisasi MTD:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-indigo-950">
                      {formatIdr(monthlyFin.netSales)}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 font-mono">
                      ({monthlyAchievementPercent}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mt-1.5 border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      monthlyAchievementPercent >= 100
                        ? 'bg-emerald-500'
                        : monthlyAchievementPercent >= 75
                        ? 'bg-indigo-600'
                        : 'bg-gradient-to-r from-amber-500 to-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, monthlyAchievementPercent)}%` }}
                  />
                </div>
              </div>

              {/* Grid Mini Bulanan */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Total Visit</span>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {monthlyFin.visitsCount} <span className="text-[10px] font-normal text-slate-400">/ {monthlyVisitTarget}</span>
                  </p>
                  <span className="text-[10px] text-indigo-700 font-semibold">{monthlyVisitPercent}% target</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Total Order</span>
                  <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">
                    {monthlyFin.ordersCount} <span className="text-[10px] font-normal text-slate-400">PO</span>
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {monthlyFin.visitsCount > 0 ? `${Math.round((monthlyFin.ordersCount / monthlyFin.visitsCount) * 100)}% strike` : '0%'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">Sisa Target</span>
                  <p className="text-xs font-bold text-amber-700 font-mono mt-0.5 truncate">
                    {formatIdr(monthlyRemainingTarget)}
                  </p>
                  <span className="text-[10px] text-slate-500">perlu dicapai</span>
                </div>
              </div>

              {/* Info Hari Efektif & Selisih Bulanan */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif (Senin–Sabtu)</span>
                </span>
                <span
                  className={`font-mono font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                    monthlyFin.selisih < 0
                      ? 'bg-rose-100 text-rose-800'
                      : monthlyFin.selisih > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>
                    {monthlyFin.selisih >= 0 ? '+' : ''}
                    {formatIdr(monthlyFin.selisih)}
                  </span>
                  <span className="text-[10px] font-normal">
                    {monthlyFin.selisih < 0 ? '(Tombok)' : '(Margin)'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Finansial Detail (Toko vs HPP vs Retur vs Selisih) */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rincian Keuangan Realisasi ({activePerformanceTab === 'HARI_INI' ? 'Hari Ini' : 'Bulan Ini'})
            </span>
            <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
              Target: {formatIdr(activeTargetSales)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Sales Toko */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white space-y-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                Total Sales Toko (Kotor)
              </span>
              <p className="text-2xl font-black font-mono text-white">
                {formatIdr(activeFin.storeSales)}
              </p>
              <p className="text-[11px] text-blue-200 pt-1">
                Nilai faktur kuitansi yang ditagihkan ke outlet
              </p>
            </div>

            {/* Pengurang Retur Toko */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Potongan Retur Barang
              </span>
              <p className="text-2xl font-black font-mono text-rose-700">
                - {formatIdr(activeFin.returnAmount)}
              </p>
              <p className="text-[11px] text-rose-600 pt-1">
                Pengembalian bad stock & expired dari toko
              </p>
            </div>

            {/* HPP Perusahaan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Harga Pabrik (HPP)
              </span>
              <p className="text-2xl font-black font-mono text-slate-800">
                {formatIdr(activeFin.companySales)}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Harga pokok resmi PT Indofood Fortuna Makmur
              </p>
            </div>

            {/* Selisih Harga (Margin Toko / Tombok Sales) */}
            <div
              className={`p-4 rounded-2xl border space-y-1 ${
                activeFin.selisih < 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block ${
                  activeFin.selisih < 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                Selisih Harga {activeFin.selisih < 0 ? '(Tombok Sales)' : '(Margin)'}
              </span>
              <p
                className={`text-2xl font-black font-mono ${
                  activeFin.selisih < 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {activeFin.selisih < 0
                  ? `- ${formatIdr(Math.abs(activeFin.selisih))}`
                  : `+ ${formatIdr(activeFin.selisih)}`}
              </p>
              <p
                className={`text-[11px] pt-1 ${
                  activeFin.selisih < 0
                    ? 'text-amber-700 font-semibold'
                    : 'text-emerald-700/80'
                }`}
              >
                {activeFin.selisih < 0
                  ? 'Harga jual di bawah HPP pabrik (tombok sales)'
                  : 'Estimasi surplus selisih keuntungan putaran barang'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kartu Navigasi Cepat (Visit, Order, Profile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateSection('visits')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Daftar Kunjungan (Visit)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Lihat riwayat rute, status GPS, dan jadwal kunjungan toko Karawang.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('orders')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Daftar Order & Kwitansi
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pantau purchase order, status approval, dan cetak ulang kwitansi.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('profile')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Profil Sales & Akun
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Informasi wilayah penugasan Karawang, target, dan login akun sales.
          </p>
        </button>
      </div>

      {/* Aktivitas Kunjungan Terbaru Hari Ini */}
      <div className="rounded-3xl bg-white border border-blue-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-blue-700" />
              Kunjungan & Transaksi Terakhir ({todayVisits.length} Hari Ini)
            </h3>
            <p className="text-xs text-slate-500">
              Daftar toko yang telah dikunjungi oleh {displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('visits')}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayVisits.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <StoreIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              Belum ada kunjungan toko yang tercatat hari ini ({todayDateStr}).
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol "Record Visit Toko" di atas untuk memulai pencatatan rute dan pesanan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayVisits.slice(0, 5).map((visit) => {
              const isOrder = visit.outcome === VisitOutcome.ORDER;
              return (
                <div
                  key={visit.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors px-2 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isOrder
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isOrder ? (
                        <ShoppingBag className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {visit.storeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {visit.district} · Jam {visit.checkInTime} · Pemilik: {visit.storeOwner}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right">
                      {isOrder ? (
                        <>
                          <span className="text-xs font-mono font-bold text-emerald-700 block">
                            {formatIdr(visit.purchaseOrder?.netAmountIdr || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {visit.purchaseOrder?.items.length || 0} SKU Pesanan
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {visit.noPurchaseDetail?.reasonLabel || 'Tidak Beli'}
                        </span>
                      )}
                    </div>

                    {isOrder && onViewInvoice && (
                      <button
                        type="button"
                        onClick={() => onViewInvoice(visit)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Kwitansi</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
