import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeft,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DepositRequest } from '../types';
import { formatPKR, formatDate } from '../lib/utils';

export const DepositHistoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'deposits'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: DepositRequest[] = [];
      snapshot.forEach((d) => list.push(d.data() as DepositRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDeposits(list);
      setLoading(false);
    }, (err) => {
      console.warn('Deposit history error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const filtered = deposits.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/deposit"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Deposit History</h1>
            <p className="text-xs text-slate-400">Track all incoming funding requests and verification statuses.</p>
          </div>
        </div>

        <Link
          to="/deposit"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow"
        >
          New Deposit
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
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

      {/* Table / List */}
      <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            Loading deposit history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ArrowDownLeft className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No deposits found</p>
            <p className="text-xs text-slate-400">
              {filter === 'all'
                ? 'You have not submitted any deposits yet.'
                : `No deposits match the "${filter}" status filter.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    item.status === 'approved'
                      ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                      : item.status === 'pending'
                      ? 'bg-amber-950/60 border border-amber-800/50 text-amber-400'
                      : 'bg-rose-950/60 border border-rose-800/50 text-rose-400'
                  }`}>
                    {item.status === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : item.status === 'pending' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">{formatPKR(item.amountPkr)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">via {item.paymentMethodName}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                      <span>Ref / TID: <strong className="text-slate-200">{item.transactionRef}</strong></span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    {item.adminRemarks && (
                      <p className="mt-1.5 text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                        Admin Note: <span className="italic">{item.adminRemarks}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    item.status === 'approved'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : item.status === 'pending'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {item.status}
                  </span>

                  {item.receiptUrl && (
                    <button
                      onClick={() => setPreviewImage(item.receiptUrl || null)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Payment Receipt Preview</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center bg-black rounded-2xl overflow-hidden max-h-[70vh]">
              <img src={previewImage} alt="Payment Receipt" className="object-contain max-h-[70vh] w-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
