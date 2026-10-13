import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Settings,
  Bell,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Save,
  MessageSquare,
  Lock,
  ArrowRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/BrandLogo';
import {
  collection,
  onSnapshot,
  query,
  doc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  UserProfile,
  DepositRequest,
  WithdrawalRequest,
  InvestmentPlan,
  PaymentMethodConfig,
  SiteSettings,
  AdminAuditLog,
  SupportTicket
} from '../../types';
import { formatPKR, formatDate } from '../../lib/utils';
import {
  approveDeposit,
  rejectDeposit,
  markWithdrawalPaid,
  rejectWithdrawal,
  adjustUserBalance,
  toggleUserStatus,
  updateKycStatus,
  saveInvestmentPlan,
  deleteInvestmentPlan,
  savePaymentMethod,
  deletePaymentMethod,
  updateSiteSettings,
  broadcastNotification,
  replySupportTicket
} from '../../services/adminService';

type AdminTab = 'overview' | 'deposits' | 'withdrawals' | 'users' | 'plans' | 'payments' | 'settings' | 'broadcast' | 'audit' | 'support';

export const AdminPage: React.FC = () => {
  const { currentUser, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Real-time collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [depositModal, setDepositModal] = useState<{ dep: DepositRequest; type: 'approve' | 'reject' } | null>(null);
  const [depositRemarks, setDepositRemarks] = useState('');

  const [withdrawalModal, setWithdrawalModal] = useState<{ wdr: WithdrawalRequest; type: 'pay' | 'reject' } | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [withdrawalRemarks, setWithdrawalRemarks] = useState('');

  const [adjustBalanceModal, setAdjustBalanceModal] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [editPlanModal, setEditPlanModal] = useState<InvestmentPlan | null>(null);
  const [editPaymentModal, setEditPaymentModal] = useState<PaymentMethodConfig | null>(null);

  // User search & filters
  const [userSearch, setUserSearch] = useState('');
  const [depositStatusFilter, setDepositStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'success' | 'warning' | 'financial'>('info');
  const [broadcastTarget, setBroadcastTarget] = useState('all');

  // Ticket reply modal
  const [replyTicketModal, setReplyTicketModal] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [ticketStatusSelect, setTicketStatusSelect] = useState<'in_progress' | 'resolved' | 'closed'>('resolved');

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(list);
    });

    const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
      const list: DepositRequest[] = [];
      snap.forEach((d) => list.push(d.data() as DepositRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDeposits(list);
    });

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      const list: WithdrawalRequest[] = [];
      snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWithdrawals(list);
    });

    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const list: InvestmentPlan[] = [];
      snap.forEach((d) => list.push(d.data() as InvestmentPlan));
      setPlans(list);
    });

    const unsubMethods = onSnapshot(collection(db, 'paymentMethods'), (snap) => {
      const list: PaymentMethodConfig[] = [];
      snap.forEach((d) => list.push(d.data() as PaymentMethodConfig));
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setPaymentMethods(list);
    });

    const unsubSettings = onSnapshot(doc(db, 'siteSettings', 'global'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data() as SiteSettings);
    });

    const unsubAudit = onSnapshot(collection(db, 'adminAuditLogs'), (snap) => {
      const list: AdminAuditLog[] = [];
      snap.forEach((d) => list.push(d.data() as AdminAuditLog));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAuditLogs(list);
    });

    const unsubTickets = onSnapshot(collection(db, 'supportTickets'), (snap) => {
      const list: SupportTicket[] = [];
      snap.forEach((d) => list.push(d.data() as SupportTicket));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSupportTickets(list);
    });

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
      unsubPlans();
      unsubMethods();
      unsubSettings();
      unsubAudit();
      unsubTickets();
    };
  }, [currentUser, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Administrative Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your account is authenticated as an investor and does not possess administrative privileges.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 transition-all border border-slate-700"
        >
          <span>Return to User Dashboard</span>
        </Link>
      </div>
    );
  }

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const openTickets = supportTickets.filter((t) => t.status === 'open' || t.status === 'in_progress');

  const totalDepositedVolume = deposits.filter((d) => d.status === 'approved').reduce((acc, curr) => acc + curr.amountPkr, 0);
  const totalWithdrawnVolume = withdrawals.filter((w) => w.status === 'paid').reduce((acc, curr) => acc + curr.amountPkr, 0);

  // Deposit Actions
  const handleConfirmDeposit = async () => {
    if (!depositModal || !currentUser) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (depositModal.type === 'approve') {
        await approveDeposit({
          depositId: depositModal.dep.id,
          adminUid: currentUser.uid,
          adminEmail: currentUser.email || 'admin@cexnetwork.finance',
          remarks: depositRemarks,
        });
        setActionSuccess(`Deposit of ${formatPKR(depositModal.dep.amountPkr)} approved and credited!`);
      } else {
        if (!depositRemarks.trim()) {
          setActionError('Please specify a rejection reason for the audit trail.');
          setActionLoading(false);
          return;
        }
        await rejectDeposit({
          depositId: depositModal.dep.id,
          adminUid: currentUser.uid,
          adminEmail: currentUser.email || 'admin@cexnetwork.finance',
          remarks: depositRemarks,
        });
        setActionSuccess(`Deposit rejected.`);
      }
      setDepositModal(null);
      setDepositRemarks('');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Deposit action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Withdrawal Actions
  const handleConfirmWithdrawal = async () => {
    if (!withdrawalModal || !currentUser) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (withdrawalModal.type === 'pay') {
        if (!payoutRef.trim()) {
          setActionError('Please enter a bank payout reference / UTR number.');
          setActionLoading(false);
          return;
        }
        await markWithdrawalPaid({
          withdrawalId: withdrawalModal.wdr.id,
          adminUid: currentUser.uid,
          adminEmail: currentUser.email || 'admin@cexnetwork.finance',
          payoutRef: payoutRef.trim(),
          remarks: withdrawalRemarks,
        });
        setActionSuccess(`Withdrawal marked as disbursed.`);
      } else {
        if (!withdrawalRemarks.trim()) {
          setActionError('Please specify rejection reason to refund reserved funds safely.');
          setActionLoading(false);
          return;
        }
        await rejectWithdrawal({
          withdrawalId: withdrawalModal.wdr.id,
          adminUid: currentUser.uid,
          adminEmail: currentUser.email || 'admin@cexnetwork.finance',
          remarks: withdrawalRemarks,
        });
        setActionSuccess(`Withdrawal rejected. Reserved funds refunded to user balance.`);
      }
      setWithdrawalModal(null);
      setPayoutRef('');
      setWithdrawalRemarks('');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Withdrawal action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Balance Adjustment Action
  const handleConfirmAdjustBalance = async () => {
    if (!adjustBalanceModal || !currentUser) return;
    const delta = Number(adjustAmount);
    if (isNaN(delta) || delta === 0) {
      setActionError('Adjustment amount cannot be zero');
      return;
    }
    if (!adjustReason.trim()) {
      setActionError('Reason is strictly required for administrative ledger adjustment');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await adjustUserBalance({
        userId: adjustBalanceModal.uid,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@cexnetwork.finance',
        amountDeltaPkr: delta,
        reason: adjustReason.trim(),
      });
      setActionSuccess(`Adjusted ${adjustBalanceModal.displayName}'s balance by ${formatPKR(delta)}`);
      setAdjustBalanceModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err?.message || 'Adjustment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Admin Suite Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">CEX Network Administration</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/60">
                  Superadmin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Privileged master console for ledger auditing, deposit review, payout rails, and risk management.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition-colors"
        >
          Switch to User Dashboard
        </Link>
      </div>

      {/* Global Alerts / Toasts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tab Navigation Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft, badge: pendingDeposits.length },
          { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight, badge: pendingWithdrawals.length },
          { id: 'users', label: 'Users', icon: Users, badge: users.length },
          { id: 'plans', label: 'Plans', icon: Layers },
          { id: 'payments', label: 'Payment Accounts', icon: Shield },
          { id: 'support', label: 'Support Desk', icon: MessageSquare, badge: openTickets.length },
          { id: 'broadcast', label: 'Broadcasts', icon: Bell },
          { id: 'settings', label: 'Website Settings', icon: Settings },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl glass-card border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Registered Users</span>
              <span className="text-2xl font-extrabold text-white font-mono mt-1 block">{users.length}</span>
              <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                {users.filter((u) => u.status === 'active').length} Active Accounts
              </span>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Pending Deposit Queue</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">{pendingDeposits.length}</span>
              <button
                onClick={() => setActiveTab('deposits')}
                className="text-[10px] text-cyan-400 hover:underline mt-1 block"
              >
                Audit Queue →
              </button>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Pending Payout Queue</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">{pendingWithdrawals.length}</span>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className="text-[10px] text-cyan-400 hover:underline mt-1 block"
              >
                Disburse Funds →
              </button>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Approved Volume</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block truncate">
                {formatPKR(totalDepositedVolume)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block truncate">
                Disbursed: {formatPKR(totalWithdrawnVolume)}
              </span>
            </div>
          </div>

          {/* Quick Action Tables for Pending Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Deposits Box */}
            <div className="rounded-3xl glass-card border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
                  <span>Pending Deposits Requiring Review</span>
                </h3>
                <button onClick={() => setActiveTab('deposits')} className="text-xs text-cyan-400 hover:underline">
                  View All ({pendingDeposits.length})
                </button>
              </div>

              {pendingDeposits.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Queue is clear. No pending deposits.</div>
              ) : (
                <div className="space-y-2">
                  {pendingDeposits.slice(0, 4).map((d) => (
                    <div key={d.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white font-mono">{formatPKR(d.amountPkr)}</p>
                        <p className="text-[10px] text-slate-400 truncate">{d.userEmail} • Ref: {d.transactionRef}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setDepositModal({ dep: d, type: 'approve' });
                            setDepositRemarks('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setDepositModal({ dep: d, type: 'reject' });
                            setDepositRemarks('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Withdrawals Box */}
            <div className="rounded-3xl glass-card border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                  <span>Pending Withdrawal Payouts</span>
                </h3>
                <button onClick={() => setActiveTab('withdrawals')} className="text-xs text-cyan-400 hover:underline">
                  View All ({pendingWithdrawals.length})
                </button>
              </div>

              {pendingWithdrawals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Queue is clear. No pending withdrawals.</div>
              ) : (
                <div className="space-y-2">
                  {pendingWithdrawals.slice(0, 4).map((w) => (
                    <div key={w.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white font-mono">{formatPKR(w.amountPkr)}</p>
                        <p className="text-[10px] text-slate-400 truncate">{w.userEmail} • {w.accountTitle} ({w.paymentMethod})</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setWithdrawalModal({ wdr: w, type: 'pay' });
                            setPayoutRef('');
                            setWithdrawalRemarks('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => {
                            setWithdrawalModal({ wdr: w, type: 'reject' });
                            setWithdrawalRemarks('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPOSIT MANAGEMENT */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-white">Deposit Requests Management</h2>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDepositStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    depositStatusFilter === st
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Ref / TID</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deposits
                    .filter((d) => depositStatusFilter === 'all' || d.status === depositStatusFilter)
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{d.userDisplayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{d.userEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{d.paymentMethodName}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatPKR(d.amountPkr)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300 select-all">{d.transactionRef}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            d.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : d.status === 'pending'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {d.receiptUrl ? (
                            <button
                              onClick={() => setSelectedReceiptUrl(d.receiptUrl || null)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] underline"
                            >
                              View Proof
                            </button>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {d.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setDepositModal({ dep: d, type: 'approve' });
                                  setDepositRemarks('Verified via gateway reconciliation.');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setDepositModal({ dep: d, type: 'reject' });
                                  setDepositRemarks('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Processed by {d.processedBy ? 'Admin' : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WITHDRAWAL MANAGEMENT */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-white">Withdrawal Payout Rail Operations</h2>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'paid', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setWithdrawalStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    withdrawalStatusFilter === st
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Beneficiary Channel</th>
                    <th className="py-3 px-4 text-right">Net Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Payout Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {withdrawals
                    .filter((w) => withdrawalStatusFilter === 'all' || w.status === withdrawalStatusFilter)
                    .map((w) => (
                      <tr key={w.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{w.userDisplayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{w.userEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{w.accountTitle}</p>
                          <p className="text-[10px] text-slate-400 font-mono select-all">
                            {w.paymentMethod} • {w.accountNumber}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-400">
                          {formatPKR(w.netAmountPkr)}
                          <span className="text-[9px] text-slate-500 block">Fee: {formatPKR(w.feePkr)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            w.status === 'paid'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : w.status === 'pending'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          {w.payoutRef ? w.payoutRef : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {w.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setWithdrawalModal({ wdr: w, type: 'pay' });
                                  setPayoutRef('');
                                  setWithdrawalRemarks('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px]"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => {
                                  setWithdrawalModal({ wdr: w, type: 'reject' });
                                  setWithdrawalRemarks('Account details mismatch / verification required.');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Disbursed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-white">Registered Investors Directory ({users.length})</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or UID..."
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 w-full sm:w-72"
              />
            </div>
          </div>

          <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4 text-right">Available Balance</th>
                    <th className="py-3 px-4 text-right">Invested</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users
                    .filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        u.displayName.toLowerCase().includes(q) ||
                        u.email.toLowerCase().includes(q) ||
                        u.uid.toLowerCase().includes(q)
                      );
                    })
                    .map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{u.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                          <span className="text-[9px] text-slate-500 font-mono">UID: {u.uid}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                          {formatPKR(u.balancePkr)}
                          {u.pendingBalancePkr > 0 && (
                            <span className="text-[9px] text-amber-400 block font-mono">
                              Escrow: {formatPKR(u.pendingBalancePkr)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-cyan-400">
                          {formatPKR(u.activeInvestedPkr)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={async () => {
                              if (!currentUser) return;
                              const newStatus = u.status === 'active' ? 'suspended' : 'active';
                              await toggleUserStatus({
                                userId: u.uid,
                                adminUid: currentUser.uid,
                                adminEmail: currentUser.email || 'admin@cexnetwork.finance',
                                newStatus,
                                reason: `Toggled via admin panel by ${currentUser.email}`,
                              });
                            }}
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              u.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {u.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setAdjustBalanceModal(u);
                              setAdjustAmount('');
                              setAdjustReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PLANS MANAGEMENT */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">Investment Plans Configuration</h2>
            <button
              onClick={() => {
                const newPlan: InvestmentPlan = {
                  id: `plan_${Date.now()}`,
                  title: 'New Strategy Pool',
                  description: 'Quantitative liquidity strategy with automated settlement.',
                  minAmountPkr: 5000,
                  maxAmountPkr: 100000,
                  durationDays: 14,
                  expectedReturnRate: 7.0,
                  returnMethod: 'Principal + Strategy Return at Maturity',
                  status: 'active',
                  riskLevel: 'Moderate',
                  terms: 'Capital locked for term duration. Risk disclosure applies.',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setEditPlanModal(newPlan);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="rounded-3xl glass-card border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-cyan-400 border border-slate-800">
                    {p.durationDays} Days Term
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    p.status === 'active'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Yield:</span>
                    <span className="text-cyan-400 font-bold">+{p.expectedReturnRate}%</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Min Allocation:</span>
                    <span className="text-white font-bold">{formatPKR(p.minAmountPkr)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setEditPlanModal(p)}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete plan ${p.title}?`)) {
                        await deleteInvestmentPlan(p.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PAYMENT METHODS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">Deposit Accounts & Gateways</h2>
            <button
              onClick={() => {
                const newMethod: PaymentMethodConfig = {
                  id: `method_${Date.now()}`,
                  name: 'New Payment Method',
                  type: 'bank',
                  accountTitle: 'CEX Network Escrow',
                  accountNumber: '000000000000',
                  bankName: 'Bank Name',
                  instructions: 'Transfer funds and provide Transaction ID (TID).',
                  minDepositPkr: 1000,
                  maxDepositPkr: 500000,
                  isActive: true,
                  sortOrder: paymentMethods.length + 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setEditPaymentModal(newMethod);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Deposit Method</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((m) => (
              <div key={m.id} className="rounded-3xl glass-card border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{m.name}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    m.isActive
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {m.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-xs text-slate-300">
                  <p>Title: <strong className="text-white">{m.accountTitle}</strong></p>
                  <p>Account/IBAN: <strong className="text-cyan-400">{m.accountNumber}</strong></p>
                  <p>Bank: {m.bankName}</p>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  {m.instructions}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setEditPaymentModal(m)}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete payment method ${m.name}?`)) {
                        await deletePaymentMethod(m.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SUPPORT DESK */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-white">Client Support Inquiries ({supportTickets.length})</h2>
          <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Subject & Message</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {supportTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{t.userEmail}</p>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {t.id}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-white">{t.subject}</p>
                        <p className="text-[11px] text-slate-400 truncate">{t.message}</p>
                        {t.adminResponse && (
                          <p className="text-[10px] text-cyan-300 italic mt-0.5 truncate">
                            Replied: {t.adminResponse}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">{t.category}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          t.status === 'resolved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setReplyTicketModal(t);
                            setTicketReplyText(t.adminResponse || '');
                            setTicketStatusSelect(t.status === 'open' ? 'in_progress' : (t.status as any));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold"
                        >
                          Respond
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BROADCAST NOTIFICATIONS */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl mx-auto rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <span>Dispatch System Announcement</span>
          </h2>
          <p className="text-xs text-slate-400">
            Publish an official platform bulletin or broadcast alerts to user dashboards.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!broadcastTitle.trim() || !broadcastMsg.trim() || !currentUser) return;
              setActionLoading(true);
              try {
                await broadcastNotification({
                  title: broadcastTitle.trim(),
                  message: broadcastMsg.trim(),
                  type: broadcastType,
                  targetUserId: broadcastTarget,
                  adminUid: currentUser.uid,
                });
                setActionSuccess('Notification successfully broadcast to users!');
                setBroadcastTitle('');
                setBroadcastMsg('');
                setTimeout(() => setActionSuccess(null), 3000);
              } catch (err: any) {
                setActionError(err?.message || 'Broadcast failed.');
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Target Audience</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Platform Users (Broadcast)</option>
                {users.slice(0, 10).map((u) => (
                  <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Headline</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Schedule Maintenance or New Arbitrage Vault Available"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Notification Message</label>
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                rows={3}
                placeholder="Detailed notification content..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              {actionLoading ? 'Dispatching...' : 'Broadcast Notification'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: WEBSITE SETTINGS */}
      {activeTab === 'settings' && siteSettings && (
        <div className="max-w-2xl mx-auto rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>Platform Financial Parameters & Settings</span>
          </h2>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentUser) return;
              setActionLoading(true);
              try {
                await updateSiteSettings(siteSettings);
                setActionSuccess('Platform settings updated successfully!');
                setTimeout(() => setActionSuccess(null), 3000);
              } catch (err: any) {
                setActionError(err?.message || 'Update failed');
              } finally {
                setActionLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Min Withdrawal (PKR)</label>
                <input
                  type="number"
                  value={siteSettings.minWithdrawalPkr}
                  onChange={(e) => setSiteSettings({ ...siteSettings, minWithdrawalPkr: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Max Withdrawal (PKR)</label>
                <input
                  type="number"
                  value={siteSettings.maxWithdrawalPkr}
                  onChange={(e) => setSiteSettings({ ...siteSettings, maxWithdrawalPkr: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Withdrawal Fee (%)</label>
                <input
                  type="number"
                  value={siteSettings.withdrawalFeePercent}
                  onChange={(e) => setSiteSettings({ ...siteSettings, withdrawalFeePercent: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp Support Number</label>
                <input
                  type="text"
                  value={siteSettings.supportWhatsApp}
                  onChange={(e) => setSiteSettings({ ...siteSettings, supportWhatsApp: e.target.value })}
                  placeholder="+92 300 0000000"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Announcement Banner Headline</label>
              <textarea
                value={siteSettings.announcementBanner}
                onChange={(e) => setSiteSettings({ ...siteSettings, announcementBanner: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* TAB 10: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-white">Immutable Administrative Audit Log</h2>
          <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Admin Email</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details / Metadata</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-cyan-400">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300">{log.adminEmail}</td>
                      <td className="py-3 px-4 text-slate-400">{log.targetCollection}/{log.targetId}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-sm truncate">{log.details}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Deposit Review (Approve or Reject) */}
      {depositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {depositModal.type === 'approve' ? 'Confirm Deposit Approval' : 'Reject Deposit Request'}
              </h4>
              <button onClick={() => setDepositModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <p>User: <strong className="text-white">{depositModal.dep.userEmail}</strong></p>
              <p>Amount: <strong className="text-emerald-400">{formatPKR(depositModal.dep.amountPkr)}</strong></p>
              <p>Gateway: {depositModal.dep.paymentMethodName}</p>
              <p>Ref: <strong className="text-cyan-400">{depositModal.dep.transactionRef}</strong></p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                {depositModal.type === 'approve' ? 'Audit Remarks (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                value={depositRemarks}
                onChange={(e) => setDepositRemarks(e.target.value)}
                placeholder="Remarks visible in user ledger and audit trail..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDepositModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  depositModal.type === 'approve'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                    : 'bg-rose-500 text-white hover:bg-rose-400'
                }`}
              >
                {actionLoading ? 'Executing...' : depositModal.type === 'approve' ? 'Authorize & Credit Balance' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Withdrawal Action (Pay or Reject) */}
      {withdrawalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {withdrawalModal.type === 'pay' ? 'Disburse Payout' : 'Reject & Refund Reserved Capital'}
              </h4>
              <button onClick={() => setWithdrawalModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <p>User: <strong className="text-white">{withdrawalModal.wdr.userEmail}</strong></p>
              <p>Net Payout: <strong className="text-cyan-400">{formatPKR(withdrawalModal.wdr.netAmountPkr)}</strong></p>
              <p>Account: {withdrawalModal.wdr.accountTitle} ({withdrawalModal.wdr.accountNumber})</p>
              <p>Bank: {withdrawalModal.wdr.paymentMethod}</p>
            </div>

            {withdrawalModal.type === 'pay' ? (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Bank Settlement Ref / UTR</label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="e.g. PK20MEZN9481928"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Rejection Reason</label>
                <textarea
                  value={withdrawalRemarks}
                  onChange={(e) => setWithdrawalRemarks(e.target.value)}
                  placeholder="Reason for refunding reserved funds..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  required
                ></textarea>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawalModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdrawal}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  withdrawalModal.type === 'pay'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                    : 'bg-rose-500 text-white hover:bg-rose-400'
                }`}
              >
                {actionLoading ? 'Processing...' : withdrawalModal.type === 'pay' ? 'Confirm Payout Disbursed' : 'Reject & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Balance Adjustment */}
      {adjustBalanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Audited Balance Adjustment
              </h4>
              <button onClick={() => setAdjustBalanceModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <p>User: <strong className="text-white">{adjustBalanceModal.displayName}</strong></p>
              <p>Current Balance: <strong className="text-emerald-400">{formatPKR(adjustBalanceModal.balancePkr)}</strong></p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Adjustment Delta (PKR) — Use positive to credit, negative to debit
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 5000 or -2000"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Mandatory Audit Reason</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Deposit reconciliation correction #1029"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustBalanceModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustBalance}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                {actionLoading ? 'Committing...' : 'Apply Adjustment to Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Plan Edit / Create */}
      {editPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configure Plan</h4>
              <button onClick={() => setEditPlanModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveInvestmentPlan(editPlanModal);
                setEditPlanModal(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-300 block mb-1">Plan Title</label>
                <input
                  type="text"
                  value={editPlanModal.title}
                  onChange={(e) => setEditPlanModal({ ...editPlanModal, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Description</label>
                <textarea
                  value={editPlanModal.description}
                  onChange={(e) => setEditPlanModal({ ...editPlanModal, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Min (PKR)</label>
                  <input
                    type="number"
                    value={editPlanModal.minAmountPkr}
                    onChange={(e) => setEditPlanModal({ ...editPlanModal, minAmountPkr: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Max (PKR)</label>
                  <input
                    type="number"
                    value={editPlanModal.maxAmountPkr}
                    onChange={(e) => setEditPlanModal({ ...editPlanModal, maxAmountPkr: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={editPlanModal.durationDays}
                    onChange={(e) => setEditPlanModal({ ...editPlanModal, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Target Yield (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editPlanModal.expectedReturnRate}
                    onChange={(e) => setEditPlanModal({ ...editPlanModal, expectedReturnRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Status</label>
                <select
                  value={editPlanModal.status}
                  onChange={(e) => setEditPlanModal({ ...editPlanModal, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPlanModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold">
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Payment Method Edit / Create */}
      {editPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configure Payment Gateway</h4>
              <button onClick={() => setEditPaymentModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await savePaymentMethod(editPaymentModal);
                setEditPaymentModal(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-300 block mb-1">Name</label>
                <input
                  type="text"
                  value={editPaymentModal.name}
                  onChange={(e) => setEditPaymentModal({ ...editPaymentModal, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Account Title</label>
                  <input
                    type="text"
                    value={editPaymentModal.accountTitle}
                    onChange={(e) => setEditPaymentModal({ ...editPaymentModal, accountTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Account Number / IBAN</label>
                  <input
                    type="text"
                    value={editPaymentModal.accountNumber}
                    onChange={(e) => setEditPaymentModal({ ...editPaymentModal, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Bank Name / Network</label>
                <input
                  type="text"
                  value={editPaymentModal.bankName}
                  onChange={(e) => setEditPaymentModal({ ...editPaymentModal, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Deposit Instructions</label>
                <textarea
                  value={editPaymentModal.instructions}
                  onChange={(e) => setEditPaymentModal({ ...editPaymentModal, instructions: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editPaymentModal.isActive}
                  onChange={(e) => setEditPaymentModal({ ...editPaymentModal, isActive: e.target.checked })}
                  className="rounded border-slate-800 text-cyan-500"
                />
                <label htmlFor="isActive" className="text-slate-300">Active and visible to investors</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPaymentModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold">
                  Save Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Support Reply */}
      {replyTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Respond to Support Inquiry</h4>
              <button onClick={() => setReplyTicketModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <p className="font-bold text-white">{replyTicketModal.subject}</p>
              <p className="text-slate-400 mt-1">{replyTicketModal.message}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Official Response</label>
              <textarea
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white resize-none"
                placeholder="Type response to investor..."
                required
              ></textarea>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Update Status</label>
              <select
                value={ticketStatusSelect}
                onChange={(e) => setTicketStatusSelect(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyTicketModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentUser || !ticketReplyText.trim()) return;
                  await replySupportTicket({
                    ticketId: replyTicketModal.id,
                    response: ticketReplyText.trim(),
                    status: ticketStatusSelect,
                    adminUid: currentUser.uid,
                  });
                  setReplyTicketModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs"
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Receipt Viewer */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Proof of Deposit Receipt</h4>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center bg-black rounded-2xl overflow-hidden max-h-[70vh]">
              <img src={selectedReceiptUrl} alt="Deposit Proof" className="object-contain max-h-[70vh] w-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
