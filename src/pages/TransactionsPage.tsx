import React, { useState, useEffect } from 'react';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LedgerEntry, LedgerType } from '../types';
import { formatPKR, formatDate } from '../lib/utils';

export const TransactionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'ledgerEntries'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: LedgerEntry[] = [];
      snapshot.forEach((d) => list.push(d.data() as LedgerEntry));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLedgerEntries(list);
      setLoading(false);
    }, (err) => {
      console.warn('Ledger entries error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const filtered = ledgerEntries.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.referenceId && item.referenceId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <History className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Auditable Financial Ledger</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically signed, immutable record of every balance-changing event on your account.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'deposit', 'withdrawal', 'investment', 'adjustment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider capitalize transition-all ${
                typeFilter === tab
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by TID or description..."
            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono">
            Loading ledger events...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No ledger entries found</p>
            <p className="text-xs text-slate-400">All financial deposits, withdrawals, and allocations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] uppercase font-mono text-slate-400">
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance Post-Tx</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.amountPkr > 0
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}>
                          {item.amountPkr > 0 ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white leading-tight">{item.description}</p>
                          <span className="text-[10px] text-slate-500 font-mono">TX: {item.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono uppercase text-[10px] text-slate-300">
                      {item.type}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                      item.amountPkr > 0 ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {item.amountPkr > 0 ? '+' : ''}{formatPKR(item.amountPkr)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {formatPKR(item.balanceAfterPkr)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : item.status === 'pending'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
