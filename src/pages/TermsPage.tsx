import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, AlertTriangle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 text-slate-300 text-xs leading-relaxed">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2">
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>

      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">Terms of Service & Investment Risk Disclosures</h1>
      </div>

      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-amber-200">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong className="block text-white mb-1">Risk Warning & Non-Guaranteed Return Notice:</strong>
          Participation in digital asset liquidity pools, spot-futures market arbitrage, and OTC execution involves financial risk. Returns are subject to actual market spreads and liquidity pool outcomes. CEX Network does not offer synthetic guaranteed yields.
        </div>
      </div>

      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Acceptance of Terms</h2>
        <p>
          By creating an account on CEX Network, submitting funding requests, or allocating capital to investment tiers, you agree to comply with all platform regulations, KYC compliance checks, and transaction settlement terms.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Account Verification & KYC</h2>
        <p>
          Users must provide accurate identity credentials upon request. Fraudulent submissions, duplicate accounts, self-referral rings, or impersonation will lead to immediate suspension and forfeiture of unauthorized attribution.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Deposits & Escrow Reconciliation</h2>
        <p>
          Deposits are credited only following verified transaction ledger reconciliation by our automated audit system or compliance staff. Submitting falsified Transaction IDs or altered screenshots is prohibited.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Withdrawals & Payout Rails</h2>
        <p>
          Withdrawals are debited and placed into reserved escrow atomically upon submission. Payments are disbursed directly to the user’s designated Pakistani bank or wallet rail once verified.
        </p>

        <h2 className="text-sm font-bold text-white uppercase tracking-wider">5. Immutable Financial Ledger</h2>
        <p>
          All account balance mutations are permanently recorded in an append-only Firestore ledger. Administrative balance adjustments must include documented reasons.
        </p>
      </div>
    </div>
  );
};
