import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Edit3,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store as StoreIcon,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  calculateDailyTargetFromMonthly,
  formatIdr,
  getEffectiveWorkingDaysInMonth,
} from '../data/karawangData';
import {
  PurchaseOrder,
  SalesRepresentative,
  Store,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';

interface SalesTeamManagementViewProps {
  salesTeam: SalesRepresentative[];
  visits: StoreVisit[];
  stores: Store[];
  availableAreas: string[];
  selectedDate: string; // YYYY-MM-DD
  onAddSalesPerson: (newPerson: SalesRepresentative) => void;
  onEditSalesPerson: (updatedPerson: SalesRepresentative) => void;
  onDeleteSalesPerson: (personId: string) => void;
}

export const SalesTeamManagementView: React.FC<SalesTeamManagementViewProps> = ({
  salesTeam,
  visits,
  stores,
  availableAreas,
  selectedDate,
  onAddSalesPerson,
  onEditSalesPerson,
  onDeleteSalesPerson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<SalesRepresentative | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<SalesRepresentative | null>(null);

  // Reference dates & Effective Working Days (Senin - Sabtu, Minggu Libur)
  const todayStr = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return selectedDate;
    }
    return new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  const currentMonthPrefix = useMemo(() => {
    return todayStr.slice(0, 7); // 'YYYY-MM'
  }, [todayStr]);

  const effectiveDaysInfo = useMemo(() => {
    return getEffectiveWorkingDaysInMonth(todayStr);
  }, [todayStr]);

  // Form State (Add / Edit) - Admin inputs Monthly Target, Daily Target is auto-calculated
  const [formName, setFormName] = useState('');
  const [formEmployeeCode, setFormEmployeeCode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formRole, setFormRole] = useState<'Sales Representative' | 'Area Supervisor' | 'Admin'>('Sales Representative');
  const [formDailyVisitTarget, setFormDailyVisitTarget] = useState<number>(25);
  const [formMonthlyOrderTargetIdr, setFormMonthlyOrderTargetIdr] = useState<number>(60000000);
  const [formAssignedDistricts, setFormAssignedDistricts] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-calculated Daily Target based on formula: Monthly Target / Effective Days (Senin-Sabtu)
  const formDailyOrderTargetIdr = useMemo(() => {
    return calculateDailyTargetFromMonthly(
      formMonthlyOrderTargetIdr,
      effectiveDaysInfo.effectiveWorkingDays
    );
  }, [formMonthlyOrderTargetIdr, effectiveDaysInfo.effectiveWorkingDays]);

  const formMonthlyVisitTarget = useMemo(() => {
    return (Number(formDailyVisitTarget) || 25) * effectiveDaysInfo.effectiveWorkingDays;
  }, [formDailyVisitTarget, effectiveDaysInfo.effectiveWorkingDays]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    const nextNum = String(salesTeam.length + 18).padStart(3, '0');
    setFormEmployeeCode(`GTM-KRW-${nextNum}`);
    setFormEmail('');
    setFormPhone('0812-');
    setFormAddress('Karawang, Jawa Barat');
    setFormPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
    setFormRole('Sales Representative');
    setFormDailyVisitTarget(25);
    setFormMonthlyOrderTargetIdr(60000000);
    setFormAssignedDistricts(availableAreas.slice(0, 3));
    setFormIsActive(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (person: SalesRepresentative) => {
    setEditingPerson(person);
    setFormName(person.name);
    setFormEmployeeCode(person.employeeCode || `GTM-KRW-${person.id.slice(-3)}`);
    setFormEmail(person.email);
    setFormPhone(person.phone || '');
    setFormAddress(person.address || '');
    setFormPhotoUrl(person.photoUrl || '');
    setFormRole(person.role || 'Sales Representative');
    setFormDailyVisitTarget(person.dailyVisitTarget || 25);
    const resolvedMonthly =
      person.monthlyOrderTargetIdr ||
      (person.dailyOrderTargetIdr
        ? person.dailyOrderTargetIdr * effectiveDaysInfo.effectiveWorkingDays
        : 60000000);
    setFormMonthlyOrderTargetIdr(resolvedMonthly);
    setFormAssignedDistricts(person.assignedDistricts || []);
    setFormIsActive(person.isActive !== false);
    setFormError(null);
  };

  // Toggle district selection
  const handleToggleDistrict = (dist: string) => {
    if (formAssignedDistricts.includes(dist)) {
      setFormAssignedDistricts(formAssignedDistricts.filter((d) => d !== dist));
    } else {
      setFormAssignedDistricts([...formAssignedDistricts, dist]);
    }
  };

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama lengkap sales wajib diisi.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Alamat email valid wajib diisi.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Alamat domisili/tempat tinggal sales wajib diisi.');
      return;
    }

    const newPerson: SalesRepresentative = {
      id: `rep-krw-${Date.now().toString(36)}`,
      employeeCode: formEmployeeCode.trim() || `GTM-KRW-${Math.floor(100 + Math.random() * 900)}`,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      phone: formPhone.trim() || '0812-0000-0000',
      address: formAddress.trim(),
      photoUrl: formPhotoUrl.trim() || undefined,
      role: formRole,
      assignedDistricts: formAssignedDistricts.length > 0 ? formAssignedDistricts : [availableAreas[0] || 'Desa Batu Jaya'],
      dailyVisitTarget: Number(formDailyVisitTarget) || 25,
      dailyOrderTargetIdr: formDailyOrderTargetIdr,
      monthlyVisitTarget: formMonthlyVisitTarget,
      monthlyOrderTargetIdr: Number(formMonthlyOrderTargetIdr) || 60000000,
      isActive: formIsActive,
      joinDate: new Date().toISOString().split('T')[0],
    };

    onAddSalesPerson(newPerson);
    setIsAddModalOpen(false);
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama lengkap sales wajib diisi.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Alamat email valid wajib diisi.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Alamat domisili/tempat tinggal sales wajib diisi.');
      return;
    }

    const updated: SalesRepresentative = {
      ...editingPerson,
      name: formName.trim(),
      employeeCode: formEmployeeCode.trim() || editingPerson.employeeCode,
      email: formEmail.trim().toLowerCase(),
      phone: formPhone.trim() || editingPerson.phone,
      address: formAddress.trim(),
      photoUrl: formPhotoUrl.trim() || undefined,
      role: formRole,
      assignedDistricts: formAssignedDistricts,
      dailyVisitTarget: Number(formDailyVisitTarget) || 25,
      dailyOrderTargetIdr: formDailyOrderTargetIdr,
      monthlyVisitTarget: formMonthlyVisitTarget,
      monthlyOrderTargetIdr: Number(formMonthlyOrderTargetIdr) || 60000000,
      isActive: formIsActive,
    };

    onEditSalesPerson(updated);
    setEditingPerson(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingPerson) return;
    onDeleteSalesPerson(deletingPerson.id);
    setDeletingPerson(null);
  };

  // Match visits for a sales representative
  const getRepVisits = (rep: SalesRepresentative, filterScope: 'today' | 'month' | 'all') => {
    const repEmail = (rep.email || '').trim().toLowerCase();
    const repId = rep.id;
    const repName = (rep.name || '').trim().toLowerCase();

    return visits.filter((v) => {
      // Identity check
      const vEmail = (v.salesRepEmail || '').trim().toLowerCase();
      const vId = v.salesRepId;
      const vName = (v.salesRepName || '').trim().toLowerCase();

      const isMatch =
        (vEmail && vEmail === repEmail) ||
        (vId && vId === repId) ||
        (vName && repName && (vName.includes(repName) || repName.includes(vName)));

      if (!isMatch) return false;

      if (filterScope === 'today') {
        return v.date === todayStr;
      }
      if (filterScope === 'month') {
        return v.date && v.date.startsWith(currentMonthPrefix);
      }
      return true;
    });
  };

  // Calculate metrics for a single representative
  const getRepMetrics = (rep: SalesRepresentative) => {
    const todayVisits = getRepVisits(rep, 'today');
    const monthVisits = getRepVisits(rep, 'month');

    // Daily Metrics
    const dailyVisitsCount = todayVisits.length;
    const dailyOrderVisits = todayVisits.filter(
      (v) => v.outcome === VisitOutcome.ORDER && v.purchaseOrder
    );
    const dailyOrdersCount = dailyOrderVisits.length;
    const dailySalesTotalIdr = dailyOrderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      return acc + (po.netAfterReturnAmountIdr ?? (po.netAmountIdr - (v.totalReturnAmountIdr || 0)));
    }, 0);

    const dailySelisihIdr = dailyOrderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      if (typeof po.totalMarginAmountIdr === 'number') {
        return acc + po.totalMarginAmountIdr;
      }
      const storeAmt = po.totalStoreAmountIdr ?? po.netAmountIdr;
      const compAmt = po.totalCompanyAmountIdr ?? po.netAmountIdr;
      return acc + (storeAmt - compAmt);
    }, 0);

    // Monthly Metrics
    const monthlyVisitsCount = monthVisits.length;
    const monthlyOrderVisits = monthVisits.filter(
      (v) => v.outcome === VisitOutcome.ORDER && v.purchaseOrder
    );
    const monthlyOrdersCount = monthlyOrderVisits.length;
    const monthlySalesTotalIdr = monthlyOrderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      return acc + (po.netAfterReturnAmountIdr ?? (po.netAmountIdr - (v.totalReturnAmountIdr || 0)));
    }, 0);

    const monthlySelisihIdr = monthlyOrderVisits.reduce((acc, v) => {
      const po = v.purchaseOrder;
      if (!po) return acc;
      if (typeof po.totalMarginAmountIdr === 'number') {
        return acc + po.totalMarginAmountIdr;
      }
      const storeAmt = po.totalStoreAmountIdr ?? po.netAmountIdr;
      const compAmt = po.totalCompanyAmountIdr ?? po.netAmountIdr;
      return acc + (storeAmt - compAmt);
    }, 0);

    // Targets: monthly target is primary, daily target is auto-calculated using effective working days (Senin - Sabtu)
    const monthlyOrderTargetIdr =
      rep.monthlyOrderTargetIdr ||
      (rep.dailyOrderTargetIdr
        ? rep.dailyOrderTargetIdr * effectiveDaysInfo.effectiveWorkingDays
        : 60000000);
    const dailyOrderTargetIdr = calculateDailyTargetFromMonthly(
      monthlyOrderTargetIdr,
      effectiveDaysInfo.effectiveWorkingDays
    );
    const dailyVisitTarget = rep.dailyVisitTarget || 25;
    const monthlyVisitTarget =
      rep.monthlyVisitTarget || dailyVisitTarget * effectiveDaysInfo.effectiveWorkingDays;

    const dailyVisitProgress = Math.min(Math.round((dailyVisitsCount / dailyVisitTarget) * 100), 100);
    const dailySalesProgress = Math.min(Math.round((dailySalesTotalIdr / dailyOrderTargetIdr) * 100), 100);
    const monthlySalesProgress = Math.min(Math.round((monthlySalesTotalIdr / monthlyOrderTargetIdr) * 100), 100);

    return {
      dailyVisitsCount,
      dailyOrdersCount,
      dailySalesTotalIdr,
      dailySelisihIdr,
      dailyVisitProgress,
      dailySalesProgress,
      monthlyVisitsCount,
      monthlyOrdersCount,
      monthlySalesTotalIdr,
      monthlySelisihIdr,
      monthlySalesProgress,
      dailyVisitTarget,
      dailyOrderTargetIdr,
      monthlyVisitTarget,
      monthlyOrderTargetIdr,
    };
  };

  // Filtered sales team list
  const filteredSalesTeam = useMemo(() => {
    return salesTeam.filter((rep) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (rep.name || '').toLowerCase().includes(q);
        const matchesCode = (rep.employeeCode || '').toLowerCase().includes(q);
        const matchesEmail = (rep.email || '').toLowerCase().includes(q);
        const matchesAddress = (rep.address || '').toLowerCase().includes(q);
        const matchesDistrict = (rep.assignedDistricts || []).some((d) => d.toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesEmail && !matchesAddress && !matchesDistrict) {
          return false;
        }
      }

      // Area filter
      if (selectedAreaFilter !== 'ALL') {
        const hasArea = (rep.assignedDistricts || []).includes(selectedAreaFilter);
        if (!hasArea) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && rep.isActive === false) return false;
      if (statusFilter === 'INACTIVE' && rep.isActive !== false) return false;

      return true;
    });
  }, [salesTeam, searchQuery, selectedAreaFilter, statusFilter]);

  // Overall totals across the entire sales team
  const overallSummary = useMemo(() => {
    let totalReps = salesTeam.length;
    let activeReps = salesTeam.filter((r) => r.isActive !== false).length;
    let totalDailyTargetToko = 0;
    let totalDailyTargetSales = 0;
    let totalRealizedDailySales = 0;
    let totalRealizedDailyVisits = 0;
    let totalDailySelisih = 0;
    let totalMonthlySelisih = 0;

    salesTeam.forEach((rep) => {
      const m = getRepMetrics(rep);
      totalDailyTargetToko += m.dailyVisitTarget;
      totalDailyTargetSales += m.dailyOrderTargetIdr;
      totalRealizedDailySales += m.dailySalesTotalIdr;
      totalRealizedDailyVisits += m.dailyVisitsCount;
      totalDailySelisih += m.dailySelisihIdr;
      totalMonthlySelisih += m.monthlySelisihIdr;
    });

    return {
      totalReps,
      activeReps,
      totalDailyTargetToko,
      totalDailyTargetSales,
      totalRealizedDailySales,
      totalRealizedDailyVisits,
      totalDailySelisih,
      totalMonthlySelisih,
    };
  }, [salesTeam, visits, todayStr, currentMonthPrefix]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              Daftar Sales Person & Tim Penjual
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {salesTeam.length} Tenaga Penjual Terdaftar
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Target: 25 Toko & Rp 2.400.000 / Hari
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Area Operasional PT Indofood Fortuna Makmur (IFM) GTM Karawang · Kelola master data PIC sales, target kunjungan harian, pantau performa realisasi penjualan, serta perhitungan selisih harga jual / tombok.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Sales Person Baru</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Sales Aktif
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {overallSummary.activeReps}{' '}
            <span className="text-xs font-normal text-slate-400">/ {overallSummary.totalReps} person</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Siap kunjungan harian lapangan
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kunjungan Hari Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <StoreIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {overallSummary.totalRealizedDailyVisits}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {overallSummary.totalDailyTargetToko} Target
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Basis target: 25 Toko/hari per sales
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sales Realisasi Hari Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-black text-emerald-700 mt-1 font-mono">
            {formatIdr(overallSummary.totalRealizedDailySales)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Target gabungan: {formatIdr(overallSummary.totalDailyTargetSales)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Akumulasi Selisih (Margin / Tombok)
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overallSummary.totalDailySelisih >= 0
                ? 'bg-blue-50 text-blue-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {overallSummary.totalDailySelisih >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <p className={`text-base font-black mt-1 font-mono ${
            overallSummary.totalDailySelisih >= 0 ? 'text-blue-700' : 'text-rose-600'
          }`}>
            {overallSummary.totalDailySelisih >= 0 ? '+' : ''}
            {formatIdr(overallSummary.totalDailySelisih)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Bulan ini: {overallSummary.totalMonthlySelisih >= 0 ? '+' : ''}
            {formatIdr(overallSummary.totalMonthlySelisih)}{' '}
            {overallSummary.totalMonthlySelisih < 0 ? '(Tombok)' : '(Surplus)'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sales: nama lengkap, kode sales, email, alamat, atau area..."
              className="w-full min-h-[44px] pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 text-slate-900"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="w-full min-h-[44px] px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 text-slate-900 cursor-pointer"
            >
              <option value="ALL">Semua Wilayah Penugasan</option>
              {availableAreas.map((area, idx) => (
                <option key={`filter-area-${area}-${idx}`} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="w-full min-h-[44px] px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 text-slate-900 cursor-pointer"
            >
              <option value="ALL">Semua Status Kepegawaian</option>
              <option value="ACTIVE">Aktif Lapangan</option>
              <option value="INACTIVE">Non-Aktif / Cuti</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Person Cards Grid */}
      {filteredSalesTeam.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-slate-800">
            Tidak ada Sales Person yang sesuai kriteria
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ubah kata kunci pencarian atau sesuaikan filter wilayah penugasan di atas.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Sales Person</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSalesTeam.map((rep, idx) => {
            const metrics = getRepMetrics(rep);
            const isTombokDaily = metrics.dailySelisihIdr < 0;
            const isTombokMonthly = metrics.monthlySelisihIdr < 0;

            return (
              <div
                key={`sales-card-${rep.id || rep.employeeCode || idx}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                {/* Top: Profile Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Avatar Photo */}
                      <div className="relative shrink-0">
                        {rep.photoUrl ? (
                          <img
                            src={rep.photoUrl}
                            alt={rep.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                            onError={(e) => {
                              // Fallback if image fails
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                            {rep.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            rep.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={rep.isActive !== false ? 'Aktif' : 'Non-Aktif'}
                        />
                      </div>

                      {/* Name & Metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 truncate">
                            {rep.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {rep.employeeCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              rep.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rep.isActive !== false ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </div>

                        {/* Contacts */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                          <a
                            href={`mailto:${rep.email}`}
                            className="inline-flex items-center gap-1 hover:text-blue-700 truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{rep.email}</span>
                          </a>
                          {rep.phone && (
                            <a
                              href={`https://wa.me/${rep.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:text-emerald-700"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{rep.phone}</span>
                            </a>
                          )}
                        </div>

                        {/* Address */}
                        <div className="mt-1.5 flex items-start gap-1 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <p className="line-clamp-2">
                            {rep.address || 'Alamat domisili belum diinput'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions (Edit / Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rep)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                        title="Edit Data Sales"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPerson(rep)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                        title="Hapus Sales"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned Territories / Districts */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Wilayah Penugasan:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(rep.assignedDistricts || []).length > 0 ? (
                        rep.assignedDistricts.map((district, dIdx) => (
                          <span
                            key={`rep-dist-${rep.id}-${district}-${dIdx}`}
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-100/80 flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3 text-blue-600" />
                            <span>{district}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Belum ada wilayah penugasan spesifik
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Performance Grids (Daily & Monthly) */}
                <div className="p-4 sm:p-5 bg-slate-50/70 space-y-4">
                  {/* Daily Performance */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Performa Hari Ini ({todayStr})
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                        Target: {metrics.dailyVisitTarget} Toko · {formatIdr(metrics.dailyOrderTargetIdr)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-1 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Kunjungan</span>
                        <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                          {metrics.dailyVisitsCount}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            / {metrics.dailyVisitTarget}
                          </span>
                        </p>
                        <span className="text-[10px] text-blue-700 font-semibold">
                          {metrics.dailyVisitProgress}% tercapai
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Order (EC)</span>
                        <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                          {metrics.dailyOrdersCount}{' '}
                          <span className="text-[10px] font-normal text-slate-400">Toko</span>
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {metrics.dailyVisitsCount > 0
                            ? `${Math.round((metrics.dailyOrdersCount / metrics.dailyVisitsCount) * 100)}% strike rate`
                            : '0% strike rate'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Sales Penjualan</span>
                        <p className="text-xs font-bold text-emerald-800 font-mono mt-0.5 truncate">
                          {formatIdr(metrics.dailySalesTotalIdr)}
                        </p>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {metrics.dailySalesProgress}% target
                        </span>
                      </div>
                    </div>

                    {/* Daily Selisih / Margin */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        Selisih Harga Hari Ini:
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isTombokDaily
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : metrics.dailySelisihIdr > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isTombokDaily ? (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        ) : metrics.dailySelisihIdr > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : null}
                        <span>
                          {metrics.dailySelisihIdr >= 0 ? '+' : ''}
                          {formatIdr(metrics.dailySelisihIdr)}
                        </span>
                        <span className="text-[10px] font-normal">
                          {isTombokDaily ? '(Tombok Sales)' : metrics.dailySelisihIdr > 0 ? '(Surplus Margin)' : '(Netral)'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Monthly Performance */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Performa Bulan Ini ({currentMonthPrefix})
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-900">
                        Target: {metrics.monthlyVisitTarget} Toko · {formatIdr(metrics.monthlyOrderTargetIdr)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-1 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Total Kunjungan</span>
                        <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                          {metrics.monthlyVisitsCount}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {Math.round((metrics.monthlyVisitsCount / metrics.monthlyVisitTarget) * 100)}% target
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Total Order</span>
                        <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">
                          {metrics.monthlyOrdersCount}{' '}
                          <span className="text-[10px] font-normal text-slate-400">PO</span>
                        </p>
                        <span className="text-[10px] text-slate-500">tercatat</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">Total Sales</span>
                        <p className="text-xs font-bold text-indigo-900 font-mono mt-0.5 truncate">
                          {formatIdr(metrics.monthlySalesTotalIdr)}
                        </p>
                        <span className="text-[10px] text-indigo-700 font-semibold">
                          {metrics.monthlySalesProgress}% target
                        </span>
                      </div>
                    </div>

                    {/* Monthly Selisih / Margin */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Total Selisih Bulan Ini:
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isTombokMonthly
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : metrics.monthlySelisihIdr > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span>
                          {metrics.monthlySelisihIdr >= 0 ? '+' : ''}
                          {formatIdr(metrics.monthlySelisihIdr)}
                        </span>
                        <span className="text-[10px] font-normal">
                          {isTombokMonthly ? '(Tombok)' : metrics.monthlySelisihIdr > 0 ? '(Surplus)' : '(Pas)'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px]">
                    ID: {rep.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rep)}
                      className="text-blue-700 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Edit Rincian</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah Sales Person Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Tambah Sales Person Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan tenaga penjual lapangan resmi IFM GTM Karawang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Lengkap Sales *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kode Karyawan / Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    placeholder="GTM-KRW-022"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Akun Email (Login & Audit) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ahmad.fauzi@indofood.co.id"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nomor WhatsApp / Telepon
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Alamat Lengkap Domisili *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Jl. Raya Telukjambe No. 89, RT 03/RW 02, Karawang Barat..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL Foto Profil Sales
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="https://... atau biarkan avatar otomatis"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan link foto pas foto sales (opsional, inisial akan otomatis ditampilkan jika dikosongkan).
                </p>
              </div>

              {/* Target Kunjungan & Target Sales (Role Admin: Input Target Bulanan -> Harian Terisi Otomatis) */}
              <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Target Sales & Kunjungan Sales Person</span>
                  </p>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif ({effectiveDaysInfo.monthName})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Input Admin: Target Sales Bulanan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold text-xs">
                        Target Sales Bulanan (Rp) *
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-600 text-white">
                        Input Admin
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={1000000}
                        step={500000}
                        value={formMonthlyOrderTargetIdr}
                        onChange={(e) => setFormMonthlyOrderTargetIdr(Number(e.target.value))}
                        placeholder="Contoh: 60000000"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono font-bold text-sm shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Pilihan:</span>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(50000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 50000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        50 Jt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(60000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 60000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        60 Jt (Standar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(62400000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 62400000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        62.4 Jt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(72000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 72000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        72 Jt
                      </button>
                    </div>
                  </div>

                  {/* Terisi Otomatis: Target Sales Harian */}
                  <div className="bg-white/90 p-3 rounded-xl border border-blue-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                          <span>Target Sales Harian</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            Terisi Otomatis
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          / Hari
                        </span>
                      </div>
                      <div className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-between font-mono font-black text-blue-900 text-sm">
                        <span>{formatIdr(formDailyOrderTargetIdr)}</span>
                        <span className="text-[10px] font-sans font-semibold text-slate-500">
                          Per Hari
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2 leading-relaxed bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                      💡 <strong>Rumus:</strong> Target Bulanan ({formatIdr(formMonthlyOrderTargetIdr)}) ÷ {effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif ({effectiveDaysInfo.monthName}, Senin–Sabtu) = <strong>{formatIdr(formDailyOrderTargetIdr)} / Hari</strong>.
                    </p>
                  </div>
                </div>

                {/* Target Kunjungan Toko */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-blue-200/60">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      Target Kunjungan Harian (Toko/Hari) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formDailyVisitTarget}
                      onChange={(e) => setFormDailyVisitTarget(Number(e.target.value))}
                      className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 focus:outline-none focus:border-blue-700 text-slate-900 font-mono font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-500">Standar operasional: 25 Toko/Hari</span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                      <span>Target Kunjungan Bulanan</span>
                      <span className="text-[10px] text-emerald-700 font-bold">Otomatis ({formDailyVisitTarget} × {effectiveDaysInfo.effectiveWorkingDays} hari)</span>
                    </label>
                    <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                      <span>{formMonthlyVisitTarget} Toko / Bulan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wilayah Penugasan (Districts / Areas) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Wilayah Penugasan (Area Karawang) *
                  </label>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    {formAssignedDistricts.length} Area Terpilih
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableAreas.map((area, idx) => {
                    const isChecked = formAssignedDistricts.includes(area);
                    return (
                      <button
                        type="button"
                        key={`area-pick-${area}-${idx}`}
                        onClick={() => handleToggleDistrict(area)}
                        className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{area}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="add-is-active" className="text-slate-800 font-semibold cursor-pointer">
                  Status Sales Aktif (Menerima penugasan rute & order)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Simpan & Daftarkan Sales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data Sales Person */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Edit Data Sales Person ({editingPerson.name})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui profil, alamat, wilayah penugasan, dan target sales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Lengkap Sales *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kode Karyawan / Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Akun Email (Login & Rekam Order) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Alamat Lengkap Domisili *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL Foto Profil Sales
                </label>
                <input
                  type="url"
                  value={formPhotoUrl}
                  onChange={(e) => setFormPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                />
              </div>

              {/* Target Kunjungan & Target Sales (Role Admin: Input Target Bulanan -> Harian Terisi Otomatis) */}
              <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Target Sales & Kunjungan Sales Person</span>
                  </p>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif ({effectiveDaysInfo.monthName})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Input Admin: Target Sales Bulanan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold text-xs">
                        Target Sales Bulanan (Rp) *
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-600 text-white">
                        Input Admin
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={1000000}
                        step={500000}
                        value={formMonthlyOrderTargetIdr}
                        onChange={(e) => setFormMonthlyOrderTargetIdr(Number(e.target.value))}
                        placeholder="Contoh: 60000000"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono font-bold text-sm shadow-2xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Pilihan:</span>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(50000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 50000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        50 Jt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(60000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 60000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        60 Jt (Standar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(62400000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 62400000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        62.4 Jt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMonthlyOrderTargetIdr(72000000)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          formMonthlyOrderTargetIdr === 72000000
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        72 Jt
                      </button>
                    </div>
                  </div>

                  {/* Terisi Otomatis: Target Sales Harian */}
                  <div className="bg-white/90 p-3 rounded-xl border border-blue-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                          <span>Target Sales Harian</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            Terisi Otomatis
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          / Hari
                        </span>
                      </div>
                      <div className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-between font-mono font-black text-blue-900 text-sm">
                        <span>{formatIdr(formDailyOrderTargetIdr)}</span>
                        <span className="text-[10px] font-sans font-semibold text-slate-500">
                          Per Hari
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2 leading-relaxed bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                      💡 <strong>Rumus:</strong> Target Bulanan ({formatIdr(formMonthlyOrderTargetIdr)}) ÷ {effectiveDaysInfo.effectiveWorkingDays} Hari Kerja Efektif ({effectiveDaysInfo.monthName}, Senin–Sabtu) = <strong>{formatIdr(formDailyOrderTargetIdr)} / Hari</strong>.
                    </p>
                  </div>
                </div>

                {/* Target Kunjungan Toko */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-blue-200/60">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      Target Kunjungan Harian (Toko/Hari) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formDailyVisitTarget}
                      onChange={(e) => setFormDailyVisitTarget(Number(e.target.value))}
                      className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 focus:outline-none focus:border-blue-700 text-slate-900 font-mono font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-500">Standar operasional: 25 Toko/Hari</span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                      <span>Target Kunjungan Bulanan</span>
                      <span className="text-[10px] text-emerald-700 font-bold">Otomatis ({formDailyVisitTarget} × {effectiveDaysInfo.effectiveWorkingDays} hari)</span>
                    </label>
                    <div className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                      <span>{formMonthlyVisitTarget} Toko / Bulan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wilayah Penugasan */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    Wilayah Penugasan (Area Karawang) *
                  </label>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    {formAssignedDistricts.length} Area Terpilih
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableAreas.map((area, idx) => {
                    const isChecked = formAssignedDistricts.includes(area);
                    return (
                      <button
                        type="button"
                        key={`edit-area-pick-${area}-${idx}`}
                        onClick={() => handleToggleDistrict(area)}
                        className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{area}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="edit-is-active" className="text-slate-800 font-semibold cursor-pointer">
                  Status Sales Aktif (Menerima penugasan rute & order)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Sales Person */}
      {deletingPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Sales Person?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda akan menghapus data sales <span className="font-bold text-slate-800">&quot;{deletingPerson.name}&quot;</span> ({deletingPerson.employeeCode}) dari sistem GTM Karawang.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <p className="font-semibold mb-0.5">Perhatian:</p>
              Riwayat visit dan order toko yang sebelumnya diinput oleh sales ini tetap tersimpan aman di database untuk kebutuhan rekap dan audit.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPerson(null)}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Ya, Hapus Sales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
