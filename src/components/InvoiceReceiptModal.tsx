import React, { useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import {
  CheckCircle2,
  Download,
  FileText,
  Printer,
  Share2,
  Store as StoreIcon,
  User,
  X,
} from 'lucide-react';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';
import { formatIdr } from '../data/karawangData';
import { PurchaseOrder, Store, StoreVisit } from '../types/gtm';

/**
 * Menghasilkan gambar stempel resmi PT Indofood Fortuna Makmur (IFM)
 * dengan bentuk oval ganda (luar putus-putus, dalam utuh),
 * badge biru solid "★ LUNAS ★", dan teks resmi IFM miring -13.5 derajat.
 */
export function generateStampDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const width = 520;
  const height = 330;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  // Rotasi miring khas stempel fisik asli
  ctx.translate(cx, cy);
  ctx.rotate((-13.5 * Math.PI) / 180);

  const stampBlue = '#1849b8';
  const badgeBlue = '#1441b8';

  // 1. Oval luar bergaris putus-putus (Dashed Outer Oval)
  ctx.beginPath();
  ctx.ellipse(0, 0, 222, 134, 0, 0, Math.PI * 2);
  ctx.strokeStyle = stampBlue;
  ctx.lineWidth = 3.6;
  ctx.setLineDash([9, 6]);
  ctx.stroke();

  // 2. Oval dalam bergaris utuh (Solid Inner Oval)
  ctx.beginPath();
  ctx.ellipse(0, 0, 198, 112, 0, 0, Math.PI * 2);
  ctx.strokeStyle = stampBlue;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([]);
  ctx.stroke();

  // 3. Teks Atas: PT INDOFOOD FORTUNA dan MAKMUR
  ctx.fillStyle = stampBlue;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 17px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('PT INDOFOOD FORTUNA', 0, -68);

  ctx.font = '900 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('MAKMUR', 0, -48);

  // 4. Kotak solid biru di tengah "★ LUNAS ★"
  const badgeW = 226;
  const badgeH = 38;
  const badgeX = -badgeW / 2;
  const badgeY = -badgeH / 2 - 2;
  const radius = 3.5;

  ctx.beginPath();
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeW - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
  ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
  ctx.lineTo(badgeX + radius, badgeY + badgeH);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fillStyle = badgeBlue;
  ctx.fill();

  // Teks putih ★ LUNAS ★ di dalam badge
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('★ LUNAS ★', 0, -2);

  // 5. Teks Bawah: SALES GTM KARAWANG dan IFM RESMI & SAH
  ctx.fillStyle = stampBlue;
  ctx.font = '900 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
  ctx.fillText('SALES GTM KARAWANG', 0, 46);

  ctx.font = '700 10.5px "Courier New", monospace, sans-serif';
  ctx.fillText('IFM RESMI & SAH', 0, 66);

  ctx.restore();

  return canvas.toDataURL('image/png');
}

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: PurchaseOrder | null;
  visit?: StoreVisit | null;
  store?: Store | null;
  salesRepName?: string;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  visit,
  store,
  salesRepName,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const currentSalesName =
    salesRepName ||
    order.salesRepName ||
    visit?.salesRepName ||
    'GTM IFM Karawang';

  const stampImageSrc = useMemo(() => generateStampDataUrl(), []);

  const orderDateFormatted = new Date(
    order.createdAt || `${order.date}T10:00:00`
  ).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalStore =
    order.totalStoreAmountIdr ??
    order.items.reduce(
      (acc, it) => acc + (it.storePriceIdr ?? it.unitPriceIdr) * it.quantity,
      0
    );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const poNum = order.poNumber || `PO-${order.id}`;
      const storeName = order.storeName || store?.name || 'Toko Pelanggan';

      // Header Banner
      doc.setFillColor(0, 75, 153); // Royal Blue
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFillColor(253, 184, 19); // Golden Yellow accent
      doc.rect(0, 32, 210, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INDOFOOD SNACK TIME', 14, 14);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SALES GTM KARAWANG · PT INDOFOOD FORTUNA MAKMUR (IFM)', 14, 21);
      doc.text('Kawasan Distribusi & Field Sales Territory Karawang, Jawa Barat', 14, 27);

      // Document Type Tag
      doc.setTextColor(253, 184, 19);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FAKTUR & KWITANSI PESANAN', 200, 18, { align: 'right' });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`No: ${poNum}`, 200, 26, { align: 'right' });

      // Transaction Metadata Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 42, 182, 38, 3, 3, 'FD');

      // Left column: Store Info
      doc.setFont('helvetica', 'bold');
      doc.text('DATA TOKO / PELANGGAN:', 18, 49);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(storeName, 18, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Pemilik: ${store?.ownerName || visit?.storeOwner || '-'} | Telp: ${
          store?.phone || '-'
        }`,
        18,
        61
      );
      doc.text(
        `Alamat: ${store?.address || visit?.address || 'Area Karawang'}`,
        18,
        67
      );
      doc.text(
        `Area: ${store?.district || order.district || 'Karawang'}`,
        18,
        73
      );

      // Right column: Sales & Date Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('INFORMASI TRANSAKSI:', 120, 49);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal: ${orderDateFormatted}`, 120, 55);
      doc.text(`Sales Rep: ${currentSalesName}`, 120, 61);
      doc.text(`Pembayaran: ${order.paymentTerm || 'Cash / COD'}`, 120, 67);
      doc.text(`Status: ${order.status || 'Submitted'}`, 120, 73);

      // Table Header
      let yPos = 88;
      doc.setFillColor(0, 75, 153);
      doc.rect(14, yPos, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('NO', 18, yPos + 5.5);
      doc.text('PRODUK / SKU', 28, yPos + 5.5);
      doc.text('SATUAN', 105, yPos + 5.5);
      doc.text('QTY', 128, yPos + 5.5);
      doc.text('HARGA JUAL', 145, yPos + 5.5);
      doc.text('TOTAL', 192, yPos + 5.5, { align: 'right' });

      yPos += 8;

      // Table Rows
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      order.items.forEach((item, idx) => {
        const itemStore = item.storePriceIdr ?? item.unitPriceIdr;
        const subtotal = itemStore * item.quantity;

        // Alternate background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, yPos, 182, 7, 'F');
        }

        doc.text(String(idx + 1), 18, yPos + 5);
        doc.text(item.productName.slice(0, 42), 28, yPos + 5);
        doc.text(item.unit, 105, yPos + 5);
        doc.text(String(item.quantity), 128, yPos + 5);
        doc.text(formatIdr(itemStore), 145, yPos + 5);
        doc.text(formatIdr(subtotal), 192, yPos + 5, { align: 'right' });

        yPos += 7;
      });

      // Bottom border for table
      doc.setDrawColor(203, 213, 225);
      doc.line(14, yPos + 1, 196, yPos + 1);

      yPos += 6;

      // Financial Summary Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(110, yPos, 86, 20, 2, 2, 'F');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Jumlah Barang:', 114, yPos + 7);
      doc.text(`${order.totalItemsCount || order.items.reduce((s, i) => s + i.quantity, 0)} Unit`, 192, yPos + 7, {
        align: 'right',
      });

      doc.setTextColor(0, 75, 153);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('TOTAL PEMBAYARAN:', 114, yPos + 15);
      doc.text(formatIdr(totalStore), 192, yPos + 15, { align: 'right' });

      // Signatures
      yPos += 26;
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      // Store signature
      doc.text('Penerima / Pemilik Toko,', 26, yPos);
      doc.line(22, yPos + 22, 70, yPos + 22);
      doc.setFont('helvetica', 'bold');
      doc.text(`( ${storeName} )`, 26, yPos + 27);

      // Sales signature
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Sales Representative IFM,', 128, yPos);

      // Digital handwritten signature line in cursive style (sesuai referensi gambar user)
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(22);
      doc.setTextColor(24, 45, 105);
      doc.text(currentSalesName, 128, yPos + 15);

      // Official Stempel Indofood in jsPDF (Indofood Stamp - persis sesuai gambar user)
      try {
        const stampDataUrl = generateStampDataUrl();
        if (stampDataUrl) {
          // Ukuran stempel proporsional (lebar 44mm, tinggi 27.9mm)
          // Menumpuk di sebelah kanan tanda tangan sales, tepat di atas garis
          const stampW = 44;
          const stampH = 27.9;
          const stampX = 146;
          const stampY = yPos + 1.5;
          doc.addImage(stampDataUrl, 'PNG', stampX, stampY, stampW, stampH);
        }
      } catch (stampErr) {
        console.warn('Gagal memuat stempel PNG di PDF:', stampErr);
      }

      // Sales signature line
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(124, yPos + 22, 194, yPos + 22);

      // Sales name under line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`( ${currentSalesName} )`, 159, yPos + 27, { align: 'center' });

      // Footer notice
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Kwitansi ini diterbitkan secara resmi melalui Aplikasi Sales GTM Karawang - PT Indofood Fortuna Makmur (IFM).',
        105,
        286,
        { align: 'center' }
      );

      doc.save(`Kwitansi-Indofood-${poNum}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback: trigger print
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      {/* Container with print styles */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Bar (Non-print) */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between border-b border-blue-700/50 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Faktur & Kwitansi Resmi
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-blue-950 font-mono">
                  {order.poNumber}
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                PT Indofood Fortuna Makmur (IFM) · Area Karawang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar (Non-print) */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pesanan tercatat di sistem · Siap cetak atau unduh PDF
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-blue-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Faktur</span>
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div
          ref={receiptRef}
          className="p-6 sm:p-8 space-y-6 overflow-y-auto print:p-0 print:overflow-visible print:m-0"
        >
          {/* Receipt Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-blue-600">
            <div>
              <IndofoodSnackTimeLogo size="lg" />
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Pusat Distribusi Snack GTM Karawang · PT Indofood Fortuna Makmur (IFM)
              </p>
              <p className="text-[11px] text-slate-400">
                Jl. Akses Interchange Karawang Barat, Telukjambe Timur, Karawang
              </p>
            </div>
            <div className="sm:text-right bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 sm:bg-transparent sm:p-0 sm:border-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-blue-700 text-white uppercase tracking-wider mb-1">
                Kwitansi Penjualan
              </span>
              <p className="text-sm font-black font-mono text-blue-950">
                {order.poNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{orderDateFormatted}</p>
            </div>
          </div>

          {/* Meta Details: Store and Sales Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <StoreIcon className="w-3.5 h-3.5 text-blue-700" />
                Data Toko / Outlet
              </p>
              <p className="text-sm font-bold text-slate-900">
                {order.storeName || store?.name || 'Toko Pelanggan'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Pemilik: <span className="font-semibold">{store?.ownerName || visit?.storeOwner || '-'}</span>
              </p>
              <p className="text-xs text-slate-600">
                Alamat: {store?.address || visit?.address || 'Karawang'}
              </p>
              <p className="text-xs font-semibold text-blue-700 mt-1">
                Area: {store?.district || order.district || 'Karawang'} · Kategori: {store?.category || 'Retail'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                Sales & Pembayaran
              </p>
              <p className="text-sm font-bold text-slate-900">
                {currentSalesName}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Metode: <span className="font-semibold">{order.paymentTerm}</span>
              </p>
              <p className="text-xs text-slate-600">
                Status: <span className="font-semibold text-emerald-700">{order.status}</span>
              </p>
              {order.deliveryNotes && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-1.5 mt-1 border border-amber-200">
                  Catatan: {order.deliveryNotes}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-900 text-white font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">No</th>
                  <th className="px-3.5 py-2.5">Produk Snack</th>
                  <th className="px-3.5 py-2.5">Satuan</th>
                  <th className="px-3.5 py-2.5 text-center">Qty</th>
                  <th className="px-3.5 py-2.5 text-right">Harga Jual</th>
                  <th className="px-3.5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {order.items.map((it, idx) => {
                  const storePrice = it.storePriceIdr ?? it.unitPriceIdr;
                  const lineTotal = storePrice * it.quantity;

                  return (
                    <tr key={it.skuId || idx} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-3 text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-900">{it.productName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {it.skuCode}
                        </p>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {it.unit}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-900">
                        {it.quantity}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-blue-900">
                        {formatIdr(storePrice)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                        {formatIdr(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white shadow-md">
            <div>
              <p className="text-xs text-blue-200">
                Total Jumlah Barang: <span className="font-bold text-amber-300 font-mono">{order.totalItemsCount || order.items.reduce((s, i) => s + i.quantity, 0)}</span> item
              </p>
              <p className="text-[11px] text-blue-300/80 mt-1">
                Kwitansi transaksi resmi penjualan Indofood Snack Karawang
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-blue-800/80 sm:pl-6 w-full sm:w-auto">
              <p className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                Total Pembayaran
              </p>
              <p className="text-2xl font-black font-mono text-amber-400">
                {formatIdr(totalStore)}
              </p>
            </div>
          </div>

          {/* Signatures with Authentic Sales Signature & Stempel Indofood */}
          <div className="grid grid-cols-2 gap-8 pt-4 pb-2 text-center text-xs">
            <div className="flex flex-col justify-between h-32">
              <p className="font-semibold text-slate-600">Penerima / Pemilik Toko,</p>
              <div>
                <div className="w-40 h-0.5 bg-slate-300 mx-auto" />
                <p className="font-bold text-slate-900 mt-1.5">
                  ( {store?.ownerName || store?.name || 'Toko Pelanggan'} )
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between h-32 relative">
              <p className="font-semibold text-slate-600 text-left pl-2">
                Sales Representative IFM,
              </p>

              {/* Signature container with Stamp + Handwritten Signature (persis referensi gambar) */}
              <div className="relative flex flex-col items-center justify-end w-full">
                {/* Official Stempel Indofood (Identik dengan PDF) */}
                {stampImageSrc && (
                  <div className="absolute -top-7 right-0 sm:right-2 pointer-events-none select-none z-10">
                    <img
                      src={stampImageSrc}
                      alt="Stempel Resmi PT Indofood Fortuna Makmur"
                      className="w-32 sm:w-36 h-auto drop-shadow-xs"
                    />
                  </div>
                )}

                {/* Simulated Handwritten Signature */}
                <div className="font-serif italic text-2xl sm:text-3xl text-blue-950 font-bold tracking-wider select-none transform -rotate-2 mb-1 relative z-0 opacity-95 pr-14 self-start pl-6">
                  {currentSalesName}
                </div>

                {/* Underline */}
                <div className="w-48 sm:w-52 h-0.5 bg-slate-400 mx-auto relative z-0" />

                {/* Nama Sales */}
                <p className="font-bold text-slate-900 mt-1.5 relative z-0 text-xs sm:text-sm">
                  ( {currentSalesName} )
                </p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-slate-400 pt-2 border-t border-slate-100">
            Aplikasi Sales GTM Karawang · Dokumen bukti pesanan sah PT Indofood Fortuna Makmur (IFM)
          </p>
        </div>

        {/* Modal Bottom Close Button */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup Kwitansi
          </button>
        </div>
      </div>
    </div>
  );
};
