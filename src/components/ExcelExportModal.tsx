import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Package,
  Store as StoreIcon,
  X,
} from 'lucide-react';
import { formatIdr } from '../data/karawangData';
import { StoreVisit, VisitOutcome } from '../types/gtm';

export type ReportType = 'sales' | 'visits';
export type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'annual';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  visits: StoreVisit[];
}

// Helper to get week start (Monday) and end (Sunday) for a given date
function getWeekRange(dateStr: string): { start: string; end: string; label: string } {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatIso = (date: Date) => date.toISOString().split('T')[0];
  const startStr = formatIso(monday);
  const endStr = formatIso(sunday);

  return {
    start: startStr,
    end: endStr,
    label: `${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  };
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  visits,
}) => {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('daily');

  // Filter pickers
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // for daily
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(todayStr); // for weekly
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>(todayStr.slice(0, 4)); // YYYY

  const weekInfo = useMemo(() => getWeekRange(selectedWeekDate), [selectedWeekDate]);

  // Filter visits based on selected period
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const visitDate = v.date;
      if (!visitDate) return false;

      if (periodMode === 'daily') {
        return visitDate === selectedDate;
      }
      if (periodMode === 'weekly') {
        return visitDate >= weekInfo.start && visitDate <= weekInfo.end;
      }
      if (periodMode === 'monthly') {
        return visitDate.startsWith(selectedMonth);
      }
      if (periodMode === 'annual') {
        return visitDate.startsWith(selectedYear);
      }
      return true;
    });
  }, [visits, periodMode, selectedDate, weekInfo, selectedMonth, selectedYear]);

  // Flatten sales line items for the sales report
  // Columns: A: Jenis Product, B: Quantity yang Terjual, C: Harga Perusahaan, D: Harga Jual ke Toko, E: Selisih Harga, F: Nama Sales, G: Tanggal Penjualan, H: Nama Toko, I: Area, J: Kategori Toko, K: Supplier
  const salesExportRows = useMemo(() => {
    const rows: {
      jenisProduct: string;
      qty: number;
      hargaPerusahaan: number;
      hargaJualToko: number;
      selisihHarga: number;
      namaSales: string;
      tanggalPenjualan: string;
      namaToko: string;
      area: string;
      kategoriToko: string;
      supplier: string;
    }[] = [];

    filteredVisits.forEach((v) => {
      if (v.outcome !== VisitOutcome.ORDER || !v.purchaseOrder) return;
      const po = v.purchaseOrder;

      po.items.forEach((item) => {
        const qty = item.quantity || 1;
        const hargaPerusahaan = item.companyPriceIdr || item.unitPriceIdr;
        const hargaJualToko = item.storePriceIdr || item.unitPriceIdr;
        const selisihHarga = (hargaJualToko - hargaPerusahaan) * qty;

        rows.push({
          jenisProduct: `${item.productName} (${item.unit})`,
          qty,
          hargaPerusahaan,
          hargaJualToko,
          selisihHarga,
          namaSales: v.salesRepName || po.salesRepName || 'Sales IFM',
          tanggalPenjualan: po.date || v.date,
          namaToko: v.storeName,
          area: v.district,
          kategoriToko: v.storeCategory,
          supplier: item.supplier || 'PT Indofood Fortuna Makmur (IFM)',
        });
      });
    });

    return rows;
  }, [filteredVisits]);

  // Summary figures
  const salesSummary = useMemo(() => {
    const totalQty = salesExportRows.reduce((sum, r) => sum + r.qty, 0);
    const totalCompany = salesExportRows.reduce((sum, r) => sum + r.hargaPerusahaan * r.qty, 0);
    const totalStore = salesExportRows.reduce((sum, r) => sum + r.hargaJualToko * r.qty, 0);
    const totalMargin = salesExportRows.reduce((sum, r) => sum + r.selisihHarga, 0);
    return { totalQty, totalCompany, totalStore, totalMargin };
  }, [salesExportRows]);

  if (!isOpen) return null;

  // Format trigger label
  const periodLabel = (() => {
    if (periodMode === 'daily') return `Harian (${selectedDate})`;
    if (periodMode === 'weekly') return `Mingguan (${weekInfo.label})`;
    if (periodMode === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return `Bulanan (${d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    }
    return `Tahunan (${selectedYear})`;
  })();

  const handleDownloadExcel = () => {
    let filename = '';
    let tableHtml = '';

    const borderStyle = 'border: 1px solid #CBD5E1; padding: 8px 12px; font-size: 11pt;';
    const headerStyle =
      'background-color: #003366; color: #FFFFFF; font-weight: bold; border: 1px solid #002244; padding: 10px 12px; font-size: 11pt; text-align: left;';
    const headerRightStyle =
      'background-color: #003366; color: #FFFFFF; font-weight: bold; border: 1px solid #002244; padding: 10px 12px; font-size: 11pt; text-align: right;';
    const totalStyle =
      'background-color: #F1F5F9; font-weight: bold; border: 1px solid #94A3B8; padding: 10px 12px; font-size: 11pt;';

    if (reportType === 'sales') {
      filename = `Laporan-Sales-${periodMode}-${periodMode === 'daily' ? selectedDate : periodMode === 'weekly' ? selectedWeekDate : periodMode === 'monthly' ? selectedMonth : selectedYear}.xls`;

      const rowsHtml = salesExportRows
        .map(
          (r, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
          <td style="${borderStyle}">${r.jenisProduct}</td>
          <td style="${borderStyle} text-align: right;">${r.qty}</td>
          <td style="${borderStyle} text-align: right; mso-number-format:'Rp\\ #\\,##0';">${r.hargaPerusahaan}</td>
          <td style="${borderStyle} text-align: right; mso-number-format:'Rp\\ #\\,##0';">${r.hargaJualToko}</td>
          <td style="${borderStyle} text-align: right; font-weight: bold; color: #047857; mso-number-format:'Rp\\ #\\,##0';">${r.selisihHarga}</td>
          <td style="${borderStyle}">${r.namaSales}</td>
          <td style="${borderStyle} text-align: center;">${r.tanggalPenjualan}</td>
          <td style="${borderStyle} font-weight: bold;">${r.namaToko}</td>
          <td style="${borderStyle}">${r.area}</td>
          <td style="${borderStyle}">${r.kategoriToko}</td>
          <td style="${borderStyle}">${r.supplier}</td>
        </tr>`
        )
        .join('');

      tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Sales IFM</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <h2 style="color: #003366; margin-bottom: 4px;">PT INDOFOOD FORTUNA MAKMUR (IFM) - SALES GTM KARAWANG</h2>
        <h3 style="color: #475569; margin-top: 0; font-weight: normal;">Laporan Data Penjualan (Sales Report) · Periode: <strong>${periodLabel}</strong></h3>
        <p style="font-size: 10pt; color: #64748B;">Diekspor pada: ${new Date().toLocaleString('id-ID')} WIB · Supplier: PT Indofood Fortuna Makmur (IFM)</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th style="${headerStyle}">Jenis Product (Kolom A)</th>
              <th style="${headerRightStyle}">Quantity yang Terjual (Kolom B)</th>
              <th style="${headerRightStyle}">Harga Perusahaan (Kolom C)</th>
              <th style="${headerRightStyle}">Harga Jual ke Toko (Kolom D)</th>
              <th style="${headerRightStyle}">Selisih Harga (Kolom E)</th>
              <th style="${headerStyle}">Nama Sales (Kolom F)</th>
              <th style="${headerStyle} text-align: center;">Tanggal Penjualan (Kolom G)</th>
              <th style="${headerStyle}">Nama Toko (Kolom H)</th>
              <th style="${headerStyle}">Area (Kolom I)</th>
              <th style="${headerStyle}">Kategori Toko (Kolom J)</th>
              <th style="${headerStyle}">Supplier (Kolom K)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 20px;">Tidak ada data transaksi pada periode ini</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td style="${totalStyle}">TOTAL / GRAND TOTAL</td>
              <td style="${totalStyle} text-align: right;">${salesSummary.totalQty}</td>
              <td style="${totalStyle} text-align: right; mso-number-format:'Rp\\ #\\,##0';">${salesSummary.totalCompany}</td>
              <td style="${totalStyle} text-align: right; mso-number-format:'Rp\\ #\\,##0';">${salesSummary.totalStore}</td>
              <td style="${totalStyle} text-align: right; color: #047857; mso-number-format:'Rp\\ #\\,##0';">${salesSummary.totalMargin}</td>
              <td style="${totalStyle}" colspan="6"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>`;
    } else {
      // Visit report
      filename = `Laporan-Visit-Toko-${periodMode}-${periodMode === 'daily' ? selectedDate : periodMode === 'weekly' ? selectedWeekDate : periodMode === 'monthly' ? selectedMonth : selectedYear}.xls`;

      const rowsHtml = filteredVisits
        .map(
          (v, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
          <td style="${borderStyle} font-family: monospace;">${v.visitCode || v.id}</td>
          <td style="${borderStyle} text-align: center;">${v.date}</td>
          <td style="${borderStyle} text-align: center;">${v.checkInTime}</td>
          <td style="${borderStyle} text-align: center;">${v.checkOutTime}</td>
          <td style="${borderStyle} font-weight: bold;">${v.storeName}</td>
          <td style="${borderStyle}">${v.storeOwner}</td>
          <td style="${borderStyle}">${v.storeCategory}</td>
          <td style="${borderStyle}">${v.district}</td>
          <td style="${borderStyle}">${v.address}</td>
          <td style="${borderStyle}">${v.salesRepName}</td>
          <td style="${borderStyle} font-weight: bold; text-align: center; color: ${v.outcome === VisitOutcome.ORDER ? '#047857' : '#D97706'};">${v.outcome}</td>
          <td style="${borderStyle} font-family: monospace;">${v.purchaseOrder?.poNumber || '—'}</td>
          <td style="${borderStyle} text-align: right; mso-number-format:'Rp\\ #\\,##0';">${v.purchaseOrder?.netAmountIdr || 0}</td>
          <td style="${borderStyle}">${v.noPurchaseDetail?.reasonLabel || '—'}</td>
          <td style="${borderStyle} text-align: center;">${v.gpsVerified ? 'GPS Verified' : 'Manual'}</td>
          <td style="${borderStyle}">${v.generalNotes || v.purchaseOrder?.deliveryNotes || '—'}</td>
        </tr>`
        )
        .join('');

      tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Visit Toko IFM</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <h2 style="color: #003366; margin-bottom: 4px;">PT INDOFOOD FORTUNA MAKMUR (IFM) - SALES GTM KARAWANG</h2>
        <h3 style="color: #475569; margin-top: 0; font-weight: normal;">Laporan Kunjungan Toko (Store Visit Report) · Periode: <strong>${periodLabel}</strong></h3>
        <p style="font-size: 10pt; color: #64748B;">Diekspor pada: ${new Date().toLocaleString('id-ID')} WIB · Total Kunjungan: ${filteredVisits.length}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th style="${headerStyle}">Kode Visit</th>
              <th style="${headerStyle} text-align: center;">Tanggal</th>
              <th style="${headerStyle} text-align: center;">Jam In</th>
              <th style="${headerStyle} text-align: center;">Jam Out</th>
              <th style="${headerStyle}">Nama Toko</th>
              <th style="${headerStyle}">Pemilik Toko</th>
              <th style="${headerStyle}">Kategori Toko</th>
              <th style="${headerStyle}">Area (Kecamatan)</th>
              <th style="${headerStyle}">Alamat Lengkap</th>
              <th style="${headerStyle}">Nama Sales</th>
              <th style="${headerStyle} text-align: center;">Hasil Visit</th>
              <th style="${headerStyle}">No PO</th>
              <th style="${headerRightStyle}">Nilai Penjualan (IDR)</th>
              <th style="${headerStyle}">Alasan Tidak Beli</th>
              <th style="${headerStyle} text-align: center;">Status GPS</th>
              <th style="${headerStyle}">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="16" style="text-align: center; padding: 20px;">Tidak ada kunjungan pada periode ini</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>`;
    }

    const blob = new Blob([tableHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black tracking-tight text-white">
                Ekspor Laporan Excel (.xls)
              </h2>
            </div>
            <p className="text-xs text-blue-200">
              PT Indofood Fortuna Makmur (IFM) · Format resmi Excel kompatibel Google Sheets & LibreOffice
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Step 1: Pilih Jenis Laporan */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Pilih Jenis Laporan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReportType('sales')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  reportType === 'sales'
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-700/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    reportType === 'sales'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Laporan Data Sales (Penjualan)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Kolom A-K: Produk, Qty, Harga Pabrik, Harga Toko, Selisih Harga, Sales, Toko, Area, Supplier.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('visits')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  reportType === 'visits'
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-700/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    reportType === 'visits'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Laporan Kunjungan Toko (Visit)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Rekap kunjungan toko, jam check-in/out, GPS, outcome, no purchase reason, & nilai PO.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Pilih Periode Laporan */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Pilih Periode Laporan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPeriodMode('daily')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                  periodMode === 'daily'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Daily (Harian)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('weekly')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                  periodMode === 'weekly'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Weekly (Mingguan)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('monthly')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                  periodMode === 'monthly'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Monthly (Bulanan)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('annual')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                  periodMode === 'annual'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Annual (Tahunan)
              </button>
            </div>

            {/* Input Picker sesuai periode */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              {periodMode === 'daily' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pilih Tanggal Laporan Harian:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-700"
                  />
                </div>
              )}

              {periodMode === 'weekly' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">
                    Pilih Tanggal dalam Satu Minggu:
                  </label>
                  <input
                    type="date"
                    value={selectedWeekDate}
                    onChange={(e) => setSelectedWeekDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-700"
                  />
                  <p className="text-xs text-blue-900 font-semibold bg-blue-100/70 px-3 py-1.5 rounded-lg border border-blue-200">
                    Rentang Minggu Aktif: {weekInfo.label} ({weekInfo.start} s/d {weekInfo.end})
                  </p>
                </div>
              )}

              {periodMode === 'monthly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pilih Bulan Laporan:
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-700"
                  />
                </div>
              )}

              {periodMode === 'annual' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pilih Tahun Laporan:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-700"
                  >
                    <option value="2026">Tahun 2026 (Tahun Berjalan)</option>
                    <option value="2025">Tahun 2025</option>
                    <option value="2024">Tahun 2024</option>
                    <option value="2027">Tahun 2027</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Stats */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-950">Pratinjau Data yang Akan Diekspor:</span>
              <span className="font-semibold text-blue-800">{periodLabel}</span>
            </div>

            {reportType === 'sales' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Baris Penjualan</p>
                  <p className="text-base font-bold text-blue-950 font-mono">
                    {salesExportRows.length} item
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Total Quantity</p>
                  <p className="text-base font-bold text-blue-950 font-mono">
                    {salesSummary.totalQty} unit
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Total Nilai Toko</p>
                  <p className="text-sm font-bold text-blue-900 font-mono truncate">
                    {formatIdr(salesSummary.totalStore)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] text-emerald-800">Total Selisih Harga</p>
                  <p className="text-sm font-bold text-emerald-800 font-mono truncate">
                    +{formatIdr(salesSummary.totalMargin)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Total Kunjungan Toko</p>
                  <p className="text-base font-bold text-blue-950 font-mono">
                    {filteredVisits.length} visit
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Kunjungan ORDER (Beli)</p>
                  <p className="text-base font-bold text-emerald-700 font-mono">
                    {filteredVisits.filter((v) => v.outcome === VisitOutcome.ORDER).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <p className="text-[10px] text-slate-500">Kunjungan NO ORDER</p>
                  <p className="text-base font-bold text-amber-700 font-mono">
                    {filteredVisits.filter((v) => v.outcome === VisitOutcome.NO_ORDER).length}
                  </p>
                </div>
              </div>
            )}

            {reportType === 'sales' && (
              <p className="text-[11px] text-slate-500 pt-1">
                Struktur kolom Excel: <strong>A:</strong> Jenis Product, <strong>B:</strong> Qty Terjual, <strong>C:</strong> Harga Pabrik, <strong>D:</strong> Harga Toko, <strong>E:</strong> Selisih Harga, <strong>F:</strong> Nama Sales, <strong>G:</strong> Tgl Penjualan, <strong>H:</strong> Nama Toko, <strong>I:</strong> Area, <strong>J:</strong> Kategori Toko, <strong>K:</strong> Supplier PT IFM.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>Download Excel (.xls)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
