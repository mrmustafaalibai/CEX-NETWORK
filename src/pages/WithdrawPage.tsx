import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Wallet,
  Building2,
  Smartphone,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteSettings } from '../types';
import { submitWithdrawalRequest } from '../services/userService';

export const WithdrawPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [method, setMethod] = useState<'bank' | 'easypaisa' | 'jazzcash'>('bank');
  const [amount, setAmount] = useState<string>('');
  const [accountTitle, setAccountTitle] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data() as SiteSettings);
      }
    });
    return () => unsub();
  }, []);

  const minWithdraw = siteSettings?.minWithdrawalPkr || 1000;
  const maxWithdraw = siteSettings?.maxWithdrawalPkr || 500000;
  const feePercent = siteSettings?.withdrawalFeePercent || 0;

  const numAmount = Number(amount) || 0;
  const feeAmount = numAmount * (feePercent / 100);
  const netAmount = Math.max(0, numAmount - feeAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser || !userProfile) return;

    if (numAmount < minWithdraw) {
      setError(`Minimum withdrawal is ${formatPKR(minWithdraw)}`);
      return;
    }

    if (numAmount > maxWithdraw) {
      setError(`Maximum withdrawal is ${formatPKR(maxWithdraw)}`);
      return;
    }

    if (numAmount > userProfile.balancePkr) {
      setError(`Insufficient available balance. You have ${formatPKR(userProfile.balancePkr)}`);
      return;
    }

    if (!accountTitle.trim() || !accountNumber.trim()) {
      setError('Account Title and Account Number are required');
      return;
    }

    if (method === 'bank' && !bankName.trim()) {
      setError('Please provide Bank Name');
      return;
    }

    setSubmitting(true);
    try {
      const wId = await submitWithdrawalRequest({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userDisplayName: userProfile.displayName,
        amountPkr: numAmount,
        feePkr: feeAmount,
        paymentMethod: method === 'bank' ? `Bank (${bankName})` : method === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      });

      setSuccessId(wId);
    } catch (err: any) {
      setError(err?.message || 'Withdrawal request failed. Please check your balance and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl glass-card p-8 border border-emerald-500/30 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Withdrawal Dispatched to Escrow</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Your withdrawal of <strong className="text-white font-mono">{formatPKR(numAmount)}</strong> has been reserved. Net payout of <strong className="text-cyan-400 font-mono">{formatPKR(netAmount)}</strong> will be disbursed to your account.
          </p>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 max-w-sm mx-auto">
            Reference ID: <span className="text-cyan-400">{successId}</span>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/withdrawal-history"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
            >
              Track Payout Status
            </Link>
            <button
              onClick={() => {
                setSuccessId(null);
                setAmount('');
                setAccountTitle('');
                setAccountNumber('');
                setBankName('');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all border border-slate-700"
            >
              New Withdrawal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Withdraw Capital</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Request instant payout to your verified Pakistani bank account or mobile wallet.
          </p>
        </div>
        <Link
          to="/withdrawal-history"
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
        >
          <span>Withdrawal History</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Available Balance Preview Card */}
      <div className="p-4 sm:p-5 rounded-3xl surface-card border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Withdrawable Balance</span>
            <span className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums">
              {formatPKR(userProfile?.balancePkr)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Pending Escrow</span>
          <span className="text-xs font-bold text-amber-400 font-mono tabular-nums">
            {formatPKR(userProfile?.pendingBalancePkr)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-950/40 border border-rose-800/60 p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl surface-card p-5 sm:p-6 border border-white/10 space-y-5">
        {/* Step 1: Select Channel */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Payout Channel
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMethod('bank')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                method === 'bank'
                  ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Building2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Bank Account</p>
              <p className="text-[10px] text-slate-400">Raast / IBAN</p>
            </button>

            <button
              type="button"
              onClick={() => setMethod('easypaisa')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                method === 'easypaisa'
                  ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Smartphone className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Easypaisa</p>
              <p className="text-[10px] text-slate-400">Mobile Wallet</p>
            </button>

            <button
              type="button"
              onClick={() => setMethod('jazzcash')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                method === 'jazzcash'
                  ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Smartphone className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">JazzCash</p>
              <p className="text-[10px] text-slate-400">Mobile Wallet</p>
            </button>
          </div>
        </div>

        {/* Step 2: Withdrawal Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Withdrawal Amount in PKR
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Min: {formatPKR(minWithdraw)} | Max: {formatPKR(maxWithdraw)}
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              PKR
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={minWithdraw}
              max={maxWithdraw}
              className="w-full pl-14 pr-24 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              required
            />
            <button
              type="button"
              onClick={() => setAmount(userProfile?.balancePkr.toString() || '0')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
            >
              MAX
            </button>
          </div>

          {/* Breakdown pill */}
          {numAmount > 0 && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Fee: {feePercent}% ({formatPKR(feeAmount)})</span>
              <span className="text-emerald-400 font-bold">Net Payout: {formatPKR(netAmount)}</span>
            </div>
          )}
        </div>

        {/* Step 3: Beneficiary Account Details */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            3. Beneficiary Details
          </label>

          {method === 'bank' && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Meezan Bank, HBL, Bank Alfalah, Allied Bank"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Account Holder Name (Title)</label>
            <input
              type="text"
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              placeholder="Full name registered on bank/wallet"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              {method === 'bank' ? 'Account Number or IBAN' : 'Mobile Account Number'}
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={method === 'bank' ? 'e.g. 01010102938481 or PK00MEZN000...' : 'e.g. 03451234567'}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-md shadow-cyan-400/20 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Securing Reservation in Escrow...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Submit Withdrawal Request</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Funds are deducted immediately from your available balance and safely reserved in escrow until disbursement.
        </p>
      </form>
    </div>
  );
};
