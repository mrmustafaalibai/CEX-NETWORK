import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  Copy,
  Check,
  Upload,
  AlertCircle,
  ShieldCheck,
  Clock,
  ChevronRight,
  Info,
  CheckCircle2,
  Building2,
  Smartphone,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentMethodConfig } from '../types';
import { formatPKR, copyToClipboard } from '../lib/utils';
import { submitDepositRequest } from '../services/userService';
import { DEFAULT_PAYMENT_METHODS } from '../services/seedService';

export const DepositPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(DEFAULT_PAYMENT_METHODS);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodConfig | null>(DEFAULT_PAYMENT_METHODS[0] || null);
  const [amount, setAmount] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Load configured active payment methods from Firestore
  useEffect(() => {
    const q = query(collection(db, 'paymentMethods'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const methods: PaymentMethodConfig[] = [];
      snapshot.forEach((d) => methods.push(d.data() as PaymentMethodConfig));
      methods.sort((a, b) => a.sortOrder - b.sortOrder);
      const finalMethods = methods.length > 0 ? methods : DEFAULT_PAYMENT_METHODS;
      setPaymentMethods(finalMethods);
      if (finalMethods.length > 0 && !selectedMethod) {
        setSelectedMethod(finalMethods[0]);
      }
    }, (err) => {
      console.warn('Payment methods snapshot notice:', err);
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      if (!selectedMethod && DEFAULT_PAYMENT_METHODS.length > 0) {
        setSelectedMethod(DEFAULT_PAYMENT_METHODS[0]);
      }
    });
    return () => unsub();
  }, []);

  const handleCopy = async (val: string, label: string) => {
    const ok = await copyToClipboard(val);
    if (ok) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Receipt file size must be less than 2MB');
      return;
    }

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const presetAmounts = [2000, 5000, 10000, 25000, 50000, 100000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser || !selectedMethod) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    if (numAmount < selectedMethod.minDepositPkr) {
      setError(`Minimum deposit for ${selectedMethod.name} is ${formatPKR(selectedMethod.minDepositPkr)}`);
      return;
    }

    if (numAmount > selectedMethod.maxDepositPkr) {
      setError(`Maximum single deposit is ${formatPKR(selectedMethod.maxDepositPkr)}`);
      return;
    }

    if (!transactionRef.trim()) {
      setError('Transaction ID (TID / UTR / Reference) is required to verify your payment');
      return;
    }

    setSubmitting(true);
    try {
      const depId = await submitDepositRequest({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userDisplayName: userProfile?.displayName || 'Investor',
        amountPkr: numAmount,
        paymentMethodId: selectedMethod.id,
        paymentMethodName: selectedMethod.name,
        transactionRef: transactionRef.trim(),
        receiptUrl: receiptBase64,
      });

      setSuccessId(depId);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deposit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'crypto': return <Coins className="w-5 h-5 text-amber-400" />;
      default: return <Smartphone className="w-5 h-5 text-cyan-400" />;
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl glass-card p-8 border border-emerald-500/30 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Deposit Request Submitted</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Your deposit of <strong className="text-white font-mono">{formatPKR(Number(amount))}</strong> via {selectedMethod?.name} has been queued. Our automated reconciliation team will review your receipt and transaction reference shortly.
          </p>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 max-w-sm mx-auto">
            Reference ID: <span className="text-cyan-400">{successId}</span>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/deposit-history"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
            >
              Track in Deposit History
            </Link>
            <button
              onClick={() => {
                setSuccessId(null);
                setAmount('');
                setTransactionRef('');
                setReceiptBase64('');
                setReceiptFileName('');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all border border-slate-700"
            >
              Make Another Deposit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Deposit Funds</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transfer funds to official escrow accounts and submit proof for instant credit.
          </p>
        </div>
        <Link
          to="/deposit-history"
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
        >
          <span>Deposit History</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-950/40 border border-rose-800/60 p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Payment Methods Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Step 1: Select Payment Gateway
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod?.id === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method)}
                className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {getMethodIcon(method.type)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    Active
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{method.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{method.bankName}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Method Account Details Box */}
      {selectedMethod && (
        <div className="rounded-3xl surface-card p-5 sm:p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Step 2: Official Recipient Account Details
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              Min: {formatPKR(selectedMethod.minDepositPkr)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Beneficiary Title</span>
              <p className="text-xs font-bold text-white font-mono mt-1 select-all">{selectedMethod.accountTitle}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Account Number / IBAN</span>
                <p className="text-xs font-bold text-cyan-400 font-mono mt-1 select-all">{selectedMethod.accountNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(selectedMethod.accountNumber, 'accountNumber')}
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center"
                title="Copy Account Number"
              >
                {copiedField === 'accountNumber' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Bank / Institution</span>
              <p className="text-xs font-bold text-white font-mono mt-1">{selectedMethod.bankName}</p>
            </div>
          </div>

          {selectedMethod.instructions && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-[11px] text-cyan-200 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{selectedMethod.instructions}</span>
            </div>
          )}
        </div>
      )}

      {/* Deposit Submission Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl surface-card p-5 sm:p-6 border border-white/10 space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
          Step 3: Submit Your Payment Proof
        </h3>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Deposit Amount in PKR</span>
            <span className="text-[10px] text-slate-500 font-mono">Currency: PKR</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              PKR
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={selectedMethod?.minDepositPkr || 1000}
              max={selectedMethod?.maxDepositPkr || 10000000}
              className="w-full pl-14 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          {/* Preset amount buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {presetAmounts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p.toString())}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
              >
                +{p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Reference / TID */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Transaction ID / Reference (TID / UTR)</span>
            <span className="text-[10px] text-slate-500 font-mono">Found in SMS or Receipt</span>
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. 29482019482 or TRC20 TxHash"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            required
          />
        </div>

        {/* Receipt Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Payment Screenshot / Receipt Proof (Optional but Recommended)
          </label>
          <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/40 hover:bg-slate-950 cursor-pointer transition-all">
            <Upload className="w-6 h-6 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300">
              {receiptFileName ? receiptFileName : 'Click to select or upload payment screenshot'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WebP up to 2MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              className="hidden"
            />
          </label>

          {receiptBase64 && (
            <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
              <img src={receiptBase64} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{receiptFileName}</p>
                <p className="text-[10px] text-emerald-400">Attached successfully</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptBase64('');
                  setReceiptFileName('');
                }}
                className="text-xs text-rose-400 hover:underline px-2"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-md shadow-cyan-400/20 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting to Ledger...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm & Submit Deposit</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Deposits are credited upon administrative audit of transaction hash / bank verification.
        </p>
      </form>
    </div>
  );
};
