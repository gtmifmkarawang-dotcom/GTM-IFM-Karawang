import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  PLANNED_FIRESTORE_ARCHITECTURE,
  isFirebaseConfigPopulated,
  saveFirebaseConfig,
} from '../config/firebase';
import { ExistingFirebaseConfig, SalesRepresentative } from '../types/gtm';

interface FirebaseConnectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseConfig: ExistingFirebaseConfig;
  onUpdateFirebaseConfig: (next: ExistingFirebaseConfig) => void;
  salesRep: SalesRepresentative;
  isSignedInPreview: boolean;
  onToggleSignInPreview: (signedIn: boolean) => void;
}

export const FirebaseConnectionSheet: React.FC<FirebaseConnectionSheetProps> = ({
  isOpen,
  onClose,
  firebaseConfig,
  onUpdateFirebaseConfig,
  salesRep,
  isSignedInPreview,
  onToggleSignInPreview,
}) => {
  const [draftConfig, setDraftConfig] =
    useState<ExistingFirebaseConfig>(firebaseConfig);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isFirebaseConfigPopulated(draftConfig);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(draftConfig);
    onUpdateFirebaseConfig(draftConfig);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Existing Firebase Project & Auth Architecture
            </h2>
            <p className="text-xs text-slate-500">
              Connect your existing Firebase project · No Firestore collections created yet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Architecture Status Notice */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                UI-First Mode Active (Existing Firebase Project Ready)
              </p>
              <p>
                No new Firebase project was created and no Firestore collections have been created or modified. When you are ready, enter your existing Firebase Web SDK configuration below or in environment variables to bind Firebase Authentication and Cloud Firestore.
              </p>
            </div>
          </div>

          {/* Sales Rep Auth Session Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {salesRep.name}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {salesRep.email} · {salesRep.role}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Territory: {salesRep.assignedDistricts.join(', ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleSignInPreview(!isSignedInPreview);
                onClose();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {isSignedInPreview ? 'Preview Login Screen' : 'Return to App'}
              </span>
            </button>
          </div>

          {/* Existing Firebase Web Config Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-teal-700" />
                <span>Existing Firebase Project Credentials</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {isConfigured ? 'Credentials Entered' : 'Awaiting Project Config'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Project ID (`projectId`)
                </label>
                <input
                  type="text"
                  value={draftConfig.projectId}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, projectId: e.target.value })
                  }
                  placeholder="e.g., sales-gtm-karawang"
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Auth Domain (`authDomain`)
                </label>
                <input
                  type="text"
                  value={draftConfig.authDomain}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      authDomain: e.target.value,
                    })
                  }
                  placeholder="sales-gtm-karawang.firebaseapp.com"
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Web API Key (`apiKey`)
                </label>
                <input
                  type="text"
                  value={draftConfig.apiKey}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, apiKey: e.target.value })
                  }
                  placeholder="AIzaSy..."
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  App ID (`appId`)
                </label>
                <input
                  type="text"
                  value={draftConfig.appId}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, appId: e.target.value })
                  }
                  placeholder="1:1234567890:web:abcdef"
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Storage Bucket (`storageBucket`)
                </label>
                <input
                  type="text"
                  value={draftConfig.storageBucket}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      storageBucket: e.target.value,
                    })
                  }
                  placeholder="sales-gtm-karawang.firebasestorage.app"
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Firestore Database ID
                </label>
                <input
                  type="text"
                  value={draftConfig.databaseId}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      databaseId: e.target.value,
                    })
                  }
                  placeholder="(default)"
                  className="w-full min-h-[42px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedNotice ? (
                <span className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Configuration saved locally</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  Can also be set via VITE_FIREBASE_* in .env
                </span>
              )}
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
              >
                Save Project Config
              </button>
            </div>
          </form>

          {/* Planned Firestore Schema Reference */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-700" />
              <span>Planned Cloud Firestore Structure (Not Created Yet)</span>
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/60">
              {PLANNED_FIRESTORE_ARCHITECTURE.map((col) => (
                <div key={col.collectionPath} className="p-3 text-xs">
                  <p className="font-mono font-semibold text-slate-900">
                    /{col.collectionPath}
                  </p>
                  <p className="text-slate-600 mt-0.5">{col.purpose}</p>
                  <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Fields: {col.keyFields}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
