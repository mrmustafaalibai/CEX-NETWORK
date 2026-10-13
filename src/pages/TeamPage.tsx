import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  UserCheck,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { copyToClipboard, formatDate, formatPKR } from '../lib/utils';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReferralRecord } from '../types';

export const TeamPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/#/register?ref=${userProfile?.referralCode || ''}`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: ReferralRecord[] = [];
      snapshot.forEach((d) => list.push(d.data() as ReferralRecord));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReferrals(list);
      setLoading(false);
    }, (err) => {
      console.warn('Referrals listener notice:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Affiliate Partner Network & Team</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Build and monitor your institutional referral attribution group with verifiable records.
        </p>
      </div>

      {/* Referral Link Hero Box */}
      <div className="rounded-3xl glass-card-glow p-6 sm:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-1">
              Your Exclusive Referral Code
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-wider">
                {userProfile?.referralCode || 'PRO-CEX'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Active Partner
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 select-all truncate max-w-sm">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow ${
                copied
                  ? 'bg-emerald-500 text-black'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Link' : 'Copy Partner Link'}</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Direct Referrals</span>
            <span className="text-lg font-extrabold text-white font-mono mt-0.5 block">{referrals.length}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Verified Accounts</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {userProfile?.verifiedReferralCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Commission Tier</span>
            <span className="text-lg font-extrabold text-cyan-400 font-mono mt-0.5 block">Standard (5%)</span>
          </div>
        </div>
      </div>

      {/* Compliance Notice (User Mandate) */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex items-start gap-3 text-xs leading-relaxed text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Integrity & Anti-Spam Policy:</strong>
          Self-referrals, fake email rings, or automated spoofing are blocked by server-side verification rules. Referral attribution is logged permanently on the Firestore ledger.
        </div>
      </div>

      {/* Referred Members Table */}
      <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Your Referred Team Members</h3>
          <span className="text-xs font-mono text-slate-400">{referrals.length} Members</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono">Loading team records...</div>
        ) : referrals.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No team members registered yet</p>
            <p className="text-xs text-slate-400">Share your partner link above to start onboarding teammates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-mono text-slate-400">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
                          {ref.refereeName ? ref.refereeName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-semibold text-white">{ref.refereeName || 'Anonymous Member'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {ref.refereeEmail ? `${ref.refereeEmail.substring(0, 3)}***@${ref.refereeEmail.split('@')[1] || 'mail.com'}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        ref.status === 'verified'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                      {formatDate(ref.createdAt)}
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
