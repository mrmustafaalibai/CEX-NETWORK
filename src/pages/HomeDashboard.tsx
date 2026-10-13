import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  History,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Users,
  Layers,
  Headphones,
  ChevronRight,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate, copyToClipboard } from '../lib/utils';
import { collection, query, where, onSnapshot, doc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LedgerEntry, SiteSettings, UserPlan } from '../types';
import { DEFAULT_SITE_SETTINGS } from '../services/seedService';

export const HomeDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  const [copied, setCopied] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(DEFAULT_SITE_SETTINGS);
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);
  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  const referralLink = `${window.location.origin}/#/register?ref=${userProfile?.referralCode || ''}`;

  const handleCopyReferral = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data() as SiteSettings);
      } else {
        setSiteSettings(DEFAULT_SITE_SETTINGS);
      }
    }, (err) => {
      console.warn('Site settings snapshot notice:', err);
      setSiteSettings(DEFAULT_SITE_SETTINGS);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'ledgerEntries'),
      where('userId', '==', currentUser.uid),
      limit(5)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const entries: LedgerEntry[] = [];
        snapshot.forEach((d) => entries.push(d.data() as LedgerEntry));
        entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentLedger(entries);
        setLoadingLedger(false);
      },
      (err) => {
        console.warn('Ledger snapshot note:', err);
        setLoadingLedger(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'userPlans'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'active')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const plans: UserPlan[] = [];
        snapshot.forEach((d) => plans.push(d.data() as UserPlan));
        setActivePlans(plans);
      },
      (err) => {
        console.warn('UserPlans snapshot note:', err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-28 md:pb-12">
      {/* Platform Announcement Banner */}
      {siteSettings?.announcementBanner && (
        <div className="rounded-2xl surface-card-subtle p-3.5 sm:p-4 border border-cyan-500/20 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Notice</span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">Official Advisory</span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
              {siteSettings.announcementBanner}
            </p>
          </div>
        </div>
      )}

      {/* Main Financial Balance Hero Card (Touch-Friendly) */}
      <div className="rounded-3xl surface-hero-card p-5 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-cyan-400 tracking-wide uppercase">
                Available Portfolio Balance
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                PKR
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-mono tabular-nums">
                {formatPKR(userProfile?.balancePkr)}
              </h1>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Persistent verified balance • Ready for instant deployment</span>
            </p>
          </div>

          {/* Balance Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Pending Escrow</span>
              <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block tabular-nums">
                {formatPKR(userProfile?.pendingBalancePkr)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Invested</span>
              <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block tabular-nums">
                {formatPKR(userProfile?.activeInvestedPkr)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Deposited</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block tabular-nums">
                {formatPKR(userProfile?.totalDepositedPkr)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Withdrawn</span>
              <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block tabular-nums">
                {formatPKR(userProfile?.totalWithdrawnPkr)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Shortcuts (Min Height 48px) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            to="/deposit"
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs sm:text-sm shadow-md shadow-cyan-400/20 active:scale-[0.98] transition-all"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Deposit</span>
          </Link>

          <Link
            to="/withdraw"
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 active:scale-[0.98] transition-all"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5] text-cyan-400" />
            <span>Withdraw</span>
          </Link>

          <Link
            to="/my-plans"
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 active:scale-[0.98] transition-all"
          >
            <Briefcase className="w-4 h-4 stroke-[2.5] text-emerald-400" />
            <span>My Plans ({activePlans.length})</span>
          </Link>

          <Link
            to="/transactions"
            className="min-h-[48px] flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 active:scale-[0.98] transition-all"
          >
            <History className="w-4 h-4 stroke-[2.5] text-indigo-400" />
            <span>Ledger History</span>
          </Link>
        </div>
      </div>

      {/* Referral Link & Working Copy Card (Mobile Optimized) */}
      <div className="rounded-3xl surface-card p-4 sm:p-6 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Affiliate Partner Link
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Share your verified invitation link with clients or partners to earn transparent institutional attribution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="px-3.5 py-2.5 rounded-2xl bg-[#06090e] border border-white/10 font-mono text-xs text-slate-300 select-all truncate max-w-md">
              {referralLink}
            </div>
            <button
              onClick={handleCopyReferral}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow ${
                copied
                  ? 'bg-emerald-500 text-black'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Cards Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            to="/deposit-history"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-2">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Deposit History</p>
              <p className="text-[10px] text-slate-400">TID & Status</p>
            </div>
          </Link>

          <Link
            to="/withdrawal-history"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 mb-2">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Withdrawal History</p>
              <p className="text-[10px] text-slate-400">Payout Status</p>
            </div>
          </Link>

          <Link
            to="/plans"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Investment Plans</p>
              <p className="text-[10px] text-slate-400">Explore Tiers</p>
            </div>
          </Link>

          <Link
            to="/team"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">My Team</p>
              <p className="text-[10px] text-slate-400">{userProfile?.verifiedReferralCount || 0} Members</p>
            </div>
          </Link>

          <Link
            to="/transactions"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-2">
              <History className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Full Ledger</p>
              <p className="text-[10px] text-slate-400">Statement</p>
            </div>
          </Link>

          <Link
            to="/support"
            className="p-3.5 rounded-2xl surface-card hover:border-cyan-400/40 transition-all flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 mb-2">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">24/7 Support</p>
              <p className="text-[10px] text-slate-400">Help Desk</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Active Subscribed Plans Highlights */}
      {activePlans.length > 0 && (
        <div className="rounded-3xl surface-card p-4 sm:p-6 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Active Subscribed Plans
              </h3>
            </div>
            <Link to="/my-plans" className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {activePlans.slice(0, 2).map((plan) => (
              <div key={plan.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{plan.planTitle}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Active
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">Committed</span>
                    <span className="font-bold text-white font-mono">{formatPKR(plan.investedAmountPkr)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">Maturity Date</span>
                    <span className="font-mono text-slate-300 text-[11px]">{formatDate(plan.endDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Ledger Transactions */}
      <div className="rounded-3xl surface-card p-4 sm:p-6 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Recent Ledger Entries
            </h3>
          </div>
          <Link to="/transactions" className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
            <span>Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingLedger ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">Loading transactions...</div>
        ) : recentLedger.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-400">No transactions recorded yet.</p>
            <Link
              to="/deposit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-all shadow"
            >
              <span>Deposit Funds</span>
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentLedger.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.amountPkr > 0
                        ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                        : 'bg-rose-950/60 border border-rose-800/40 text-rose-400'
                    }`}
                  >
                    {tx.amountPkr > 0 ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white leading-tight truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-bold font-mono tabular-nums ${
                      tx.amountPkr > 0 ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {tx.amountPkr > 0 ? '+' : ''}
                    {formatPKR(tx.amountPkr)}
                  </p>
                  <span
                    className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                      tx.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : tx.status === 'pending'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mandatory Investment Risk Disclosure */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 text-[11px] leading-relaxed">
        <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Institutional Safety & Risk Notice</span>
        </div>
        {siteSettings?.riskDisclosure ||
          'Trading digital financial instruments involves market risk. All transactions are logged to an immutable ledger and governed by strict compliance policies.'}
      </div>
    </div>
  );
};
