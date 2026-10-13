import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InvestmentPlan } from '../types';
import { formatPKR } from '../lib/utils';
import { investInPlan } from '../services/userService';
import { DEFAULT_INVESTMENT_PLANS } from '../services/seedService';

export const PlansPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<InvestmentPlan[]>(DEFAULT_INVESTMENT_PLANS);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investAmount, setInvestAmount] = useState<string>('');
  const [investing, setInvesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'plans'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: InvestmentPlan[] = [];
      snapshot.forEach((d) => list.push(d.data() as InvestmentPlan));
      list.sort((a, b) => a.minAmountPkr - b.minAmountPkr);
      setPlans(list.length > 0 ? list : DEFAULT_INVESTMENT_PLANS);
      setLoading(false);
    }, (err) => {
      console.warn('Plans snapshot notice:', err);
      setPlans(DEFAULT_INVESTMENT_PLANS);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleOpenInvestModal = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setInvestAmount(plan.minAmountPkr.toString());
    setError(null);
    setSuccess(false);
  };

  const handleConfirmInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPlan || !userProfile) return;

    const amount = Number(investAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    if (amount < selectedPlan.minAmountPkr) {
      setError(`Minimum investment for this plan is ${formatPKR(selectedPlan.minAmountPkr)}`);
      return;
    }

    if (amount > selectedPlan.maxAmountPkr) {
      setError(`Maximum investment for this plan is ${formatPKR(selectedPlan.maxAmountPkr)}`);
      return;
    }

    if (amount > userProfile.balancePkr) {
      setError(`Insufficient available balance. You have ${formatPKR(userProfile.balancePkr)}. Please deposit funds first.`);
      return;
    }

    setInvesting(true);
    setError(null);
    try {
      await investInPlan({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        planId: selectedPlan.id,
        planTitle: selectedPlan.title,
        investAmountPkr: amount,
        expectedReturnRate: selectedPlan.expectedReturnRate,
        durationDays: selectedPlan.durationDays,
      });

      setSuccess(true);
      setTimeout(() => {
        setSelectedPlan(null);
        navigate('/my-plans');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to activate plan subscription. Please try again.');
    } finally {
      setInvesting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Investment Portfolios & Plans</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Choose from vetted institutional liquidity pools and algorithmic digital arbitrage strategies.
          </p>
        </div>

        <Link
          to="/my-plans"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all flex items-center gap-1.5"
        >
          <span>My Active Subscriptions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Financial Safety & Transparency Disclosure (User Mandate) */}
      <div className="rounded-2xl bg-slate-900/80 border border-cyan-900/50 p-4 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <strong className="text-white block mb-0.5">Transparent Yield Disclosure:</strong>
          CEX Network does not manufacture synthetic or guaranteed yields. All returns reflect actual performance of verified liquidity deployment, arbitrage spreads, and OTC matching. Past performance is not an absolute guarantee of future return.
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-mono">
          Loading active investment catalog...
        </div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">No active plans currently open</p>
          <p className="text-xs text-slate-400">Please check back when new allocation pools are opened.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-3xl glass-card border border-slate-800 p-6 flex flex-col justify-between hover:border-cyan-500/30 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    plan.riskLevel === 'Low'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                  }`}>
                    {plan.riskLevel} Risk
                  </span>
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{plan.durationDays} Days</span>
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  {plan.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {plan.description}
                </p>

                {/* Return Rate Callout */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Target Strategy Return</span>
                    <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                      +{plan.expectedReturnRate}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Calculation: {plan.returnMethod}
                  </span>
                </div>

                {/* Limits */}
                <div className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Min Allocation</span>
                    <span className="font-bold text-white">{formatPKR(plan.minAmountPkr)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Max Allocation</span>
                    <span className="font-bold text-white">{formatPKR(plan.maxAmountPkr)}</span>
                  </div>
                </div>

                {plan.terms && (
                  <p className="mt-3 text-[10px] text-slate-500 italic">
                    Terms: {plan.terms}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenInvestModal(plan)}
                  className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Commit Capital to Plan</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Subscribe to {selectedPlan.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Term: {selectedPlan.durationDays} Days | Target: +{selectedPlan.expectedReturnRate}%
                </span>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {error}
              </div>
            )}

            {success ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Investment Confirmed!</h4>
                <p className="text-xs text-slate-400">Funds locked in vault. Redirecting to My Plans...</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmInvestment} className="space-y-4">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Available Balance:</span>
                  <span className="text-emerald-400 font-bold">{formatPKR(userProfile?.balancePkr)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex justify-between">
                    <span>Investment Amount (PKR)</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Min: {formatPKR(selectedPlan.minAmountPkr)}
                    </span>
                  </label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    min={selectedPlan.minAmountPkr}
                    max={selectedPlan.maxAmountPkr}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>Target Capital + Yield:</span>
                    <span className="text-white font-bold">
                      {formatPKR(
                        (Number(investAmount) || 0) +
                        ((Number(investAmount) || 0) * (selectedPlan.expectedReturnRate / 100))
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Maturity Lock:</span>
                    <span>{selectedPlan.durationDays} Days</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={investing}
                  className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {investing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Authorizing Commitment...</span>
                    </>
                  ) : (
                    <span>Confirm & Commit Capital</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
