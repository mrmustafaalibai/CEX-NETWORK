import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WithdrawalRequest } from '../types';
import { formatPKR, formatDate } from '../lib/utils';

export const WithdrawalHistoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: WithdrawalRequest[] = [];
      snapshot.forEach((d) => list.push(d.data() as WithdrawalRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWithdrawals(list);
      setLoading(false);
    }, (err) => {
      console.warn('Withdrawal history error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const filtered = withdrawals.filter((w) => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/withdraw"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Withdrawal History</h1>
            <p className="text-xs text-slate-400">Track your payout disbursements, banking rails, and status.</p>
          </div>
        </div>

        <Link
          to="/withdraw"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow"
        >
          New Withdrawal
        </Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'paid', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider capitalize transition-all ${
              filter === tab
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            Loading payout history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ArrowUpRight className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No withdrawals found</p>
            <p className="text-xs text-slate-400">
              {filter === 'all'
                ? 'You have not submitted any withdrawal requests yet.'
                : `No withdrawals match the "${filter}" filter.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    item.status === 'paid'
                      ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                      : item.status === 'pending' || item.status === 'processing'
                      ? 'bg-amber-950/60 border border-amber-800/50 text-amber-400'
                      : 'bg-rose-950/60 border border-rose-800/50 text-rose-400'
                  }`}>
                    {item.status === 'paid' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : item.status === 'pending' || item.status === 'processing' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">{formatPKR(item.amountPkr)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.paymentMethod})</span>
                    </div>

                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-400 font-mono">
                      <p>Beneficiary: <strong className="text-slate-200">{item.accountTitle}</strong> ({item.accountNumber})</p>
                      <p>Requested: {formatDate(item.createdAt)}</p>
                    </div>

                    {item.payoutRef && (
                      <p className="mt-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40 inline-block">
                        Disbursement Ref: {item.payoutRef}
                      </p>
                    )}

                    {item.adminRemarks && (
                      <p className="mt-1 text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                        Admin Note: <span className="italic">{item.adminRemarks}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    item.status === 'paid'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : item.status === 'pending' || item.status === 'processing'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {item.status}
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5">Net: {formatPKR(item.netAmountPkr)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
