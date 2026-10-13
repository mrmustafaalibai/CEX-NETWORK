import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 text-slate-300 text-xs leading-relaxed">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>

      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">Privacy Policy & Data Security</h1>
      </div>

      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Data Collection & Isolation</h2>
        <p>
          CEX Network collects user email, name, transaction proof references, and encrypted identity verification documents solely for anti-fraud, transaction settlement, and regulatory compliance.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Zero-Trust Access Control</h2>
        <p>
          User financial data, deposit receipts, and withdrawal account numbers are restricted using Cloud Firestore Security Rules. No third party or unauthorized account can view your financial records.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Data Retention</h2>
        <p>
          Immutable ledger records are preserved for auditing and dispute reconciliation. Users may request account profile closure at any time through our Support Desk.
        </p>
      </div>
    </div>
  );
};
