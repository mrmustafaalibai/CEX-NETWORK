import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Layers,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserPlan } from '../types';
import { formatPKR, formatDate } from '../lib/utils';

export const MyPlansPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'userPlans'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: UserPlan[] = [];
      snapshot.forEach((d) => list.push(d.data() as UserPlan));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserPlans(list);
      setLoading(false);
    }, (err) => {
      console.warn('User plans error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const activePlans = userPlans.filter((p) => p.status === 'active');
  const completedPlans = userPlans.filter((p) => p.status === 'completed');

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.min(100, Math.round(((now - start) / (end - start)) * 100));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">My Active Investments</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track your subscribed liquidity positions, vault locks, and timeline to maturity.
          </p>
        </div>

        <Link
          to="/plans"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow"
        >
          Explore More Plans
        </Link>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Active Capital</span>
          <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-1 block">
            {formatPKR(userProfile?.activeInvestedPkr)}
          </span>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Active Subscriptions</span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
            {activePlans.length}
          </span>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Settled Positions</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {completedPlans.length}
          </span>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-mono">
          Loading your active plans...
        </div>
      ) : userPlans.length === 0 ? (
        <div className="rounded-3xl glass-card border border-slate-800 py-16 px-4 text-center space-y-3">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No active subscriptions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not allocated capital to any institutional pools yet. Browse our verified investment plans to get started.
          </p>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all shadow"
          >
            <span>Explore Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscribed Allocations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPlans.map((up) => {
              const progress = calculateProgress(up.startDate, up.endDate);
              return (
                <div
                  key={up.id}
                  className="rounded-3xl glass-card border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{up.planTitle}</h4>
                      <span className="text-[10px] font-mono text-slate-400">ID: {up.id}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      up.status === 'active'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    }`}>
                      {up.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Committed Principal</span>
                      <span className="font-extrabold text-white">{formatPKR(up.investedAmountPkr)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Projected Return</span>
                      <span className="font-extrabold text-emerald-400">{formatPKR(up.expectedReturnPkr)}</span>
                    </div>
                  </div>

                  {/* Progress to maturity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Term Progress ({progress}%)</span>
                      <span>Matures: {formatDate(up.endDate)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Started: {formatDate(up.startDate)}</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      <span>Vault Locked</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
