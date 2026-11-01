export enum StoreCategory {
  GROSIR = 'Grosir',
  SEMI_GROSIR = 'Semi-Grosir',
  MINIMARKET = 'Minimarket Lokal',
  RETAIL = 'Toko Kelontong / Retail',
  WARUNG = 'Warung',
}

export enum VisitType {
  ROUTINE = 'Routine Coverage',
  NEW_ACQUISITION = 'New Store (NOO)',
  FOLLOW_UP = 'Follow-Up / Collection',
}

export enum VisitOutcome {
  ORDER = 'ORDER',
  NO_ORDER = 'NO_ORDER',
}

export enum NoPurchaseCategory {
  STOCK_FULL = 'STOCK_FULL',
  COMPETITOR_PRICE = 'COMPETITOR_PRICE',
  OWNER_ABSENT = 'OWNER_ABSENT',
  BUDGET_ISSUE = 'BUDGET_ISSUE',
  LOW_DEMAND = 'LOW_DEMAND',
  STORE_CLOSED = 'STORE_CLOSED',
  OTHER = 'OTHER',
}

export enum PaymentTerm {
  CASH = 'Cash / COD',
  TRANSFER = 'Transfer',
}

export enum OrderStatus {
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  DELIVERED = 'Delivered',
}

export type OrderUnit = 'CTN' | 'RCG' | 'Karton' | 'Box' | 'Pack' | 'Pcs';

export interface SalesRepresentative {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  role: 'Sales Representative' | 'Area Supervisor' | 'Admin';
  assignedDistricts: string[];
  dailyVisitTarget: number;
  dailyOrderTargetIdr: number;
  monthlyVisitTarget?: number;
  monthlyOrderTargetIdr?: number;
  isActive?: boolean;
  joinDate?: string;
}

export interface Store {
  id: string;
  storeCode: string;
  name: string;
  ownerName: string;
  phone: string;
  category: StoreCategory;
  district: string; // Area in Karawang (Firestore collection Area)
  subdistrict: string; // Kelurahan / Desa
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  previousSupplier?: 'Indomarco' | 'Grosir' | 'Motoris IFM' | 'Lainnya' | string;
  creditLimitIdr: number;
  isActive: boolean;
  registeredAt: string;
  lastVisitDate?: string;
  lastOutcome?: VisitOutcome;
  notes?: string;
}

export interface ProductSKU {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  defaultUnit: OrderUnit;
  units: {
    unit: OrderUnit;
    priceIdr: number;
    companyPriceIdr?: number;
    storePriceIdr?: number;
    pcsPerUnit: number;
  }[];
  stockAvailable: boolean;
}

export interface PurchaseOrderItem {
  skuId: string;
  skuCode: string;
  productName: string;
  unit: OrderUnit;
  quantity: number;
  unitPriceIdr: number;
  companyPriceIdr?: number;
  storePriceIdr?: number;
  discountIdr: number;
  subtotalIdr: number;
  companySubtotalIdr?: number;
  storeSubtotalIdr?: number;
  marginIdr?: number;
  supplier?: string;
}

export type ReturnUnit = 'Pcs' | 'RCG' | 'CTN';
export type ReturnReason = 'Bad Stock' | 'Expired' | 'Kemasan Rusak' | 'Lainnya';

export interface ReturnItem {
  id: string;
  skuId?: string;
  productName: string;
  unit: ReturnUnit;
  quantity: number;
  returnPricePerUnitIdr: number;
  subtotalReturnIdr: number;
  reason: ReturnReason;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  visitId: string;
  storeId: string;
  storeName: string;
  district: string;
  salesRepId: string;
  salesRepName: string;
  salesRepEmail?: string;
  createdAt: string;
  date: string;
  items: PurchaseOrderItem[];
  totalItemsCount: number;
  grossAmountIdr: number;
  totalDiscountIdr: number;
  netAmountIdr: number;
  totalCompanyAmountIdr?: number;
  totalStoreAmountIdr?: number;
  totalMarginAmountIdr?: number;
  returns?: ReturnItem[];
  totalReturnAmountIdr?: number;
  netAfterReturnAmountIdr?: number;
  paymentTerm: PaymentTerm;
  status: OrderStatus;
  deliveryNotes?: string;
}

export interface NoPurchaseDetail {
  category: NoPurchaseCategory;
  reasonLabel: string;
  competitorBrand?: string;
  competitorPriceNote?: string;
  estimatedStockDays?: number;
  followUpDate?: string;
  notes: string;
}

export interface StoreVisit {
  id: string;
  visitCode: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
  checkOutTime: string; // HH:mm
  salesRepId: string;
  salesRepName: string;
  salesRepEmail?: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  storeOwner: string;
  storeCategory: StoreCategory;
  district: string;
  address: string;
  visitType: VisitType;
  gpsVerified: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  shelfDisplayChecked: boolean;
  posmInstalled: boolean;
  outcome: VisitOutcome;
  purchaseOrder?: PurchaseOrder;
  returns?: ReturnItem[];
  totalReturnAmountIdr?: number;
  noPurchaseDetail?: NoPurchaseDetail;
  generalNotes?: string;
}

export interface PlannedRouteStop {
  id: string;
  storeId: string;
  sequence: number;
  date: string;
  priority: 'High' | 'Normal' | 'Follow-Up';
  reasonForVisit: string;
  completedVisitId?: string;
}

export interface ExistingFirebaseConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId: string;
}

export type AdminActionCategory =
  | 'TAMBAH_TOKO'
  | 'EDIT_TOKO'
  | 'HAPUS_TOKO'
  | 'TAMBAH_PRODUK'
  | 'EDIT_PRODUK'
  | 'HAPUS_PRODUK'
  | 'TAMBAH_SALES'
  | 'EDIT_SALES'
  | 'HAPUS_SALES'
  | 'APPROVE_ORDER'
  | 'REVERT_ORDER'
  | 'HAPUS_ORDER'
  | 'PENGATURAN_SISTEM';

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  adminName: string;
  actionType: AdminActionCategory;
  targetType: 'Toko' | 'Produk' | 'Order' | 'Sistem' | 'Sales';
  targetId?: string;
  targetTitle: string;
  details: string;
  metadata?: Record<string, unknown>;
}
