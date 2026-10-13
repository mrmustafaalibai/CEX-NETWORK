import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Send,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupportTicket, SiteSettings } from '../types';
import { formatDate } from '../lib/utils';
import { submitSupportTicket } from '../services/userService';

export const SupportPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Deposit Query');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings(docSnap.data() as SiteSettings);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((d) => list.push(d.data() as SupportTicket));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(list);
      setLoadingTickets(false);
    }, (err) => {
      console.warn('Support tickets error:', err);
      setLoadingTickets(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitSupportTicket({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority,
      });

      setSubject('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How long does a deposit take to reflect in my available balance?',
      a: 'Bank transfers, Easypaisa, and JazzCash deposits are typically audited and credited within 10 to 30 minutes of submitting your Transaction ID (TID) and receipt proof.',
    },
    {
      q: 'What are the withdrawal processing limits and fees?',
      a: 'Minimum withdrawal is PKR 1,000. All payout requests are held securely in escrow while the banking dispatch rails execute the transfer to your verified account.',
    },
    {
      q: 'How do investment allocations work?',
      a: 'When you commit capital to an investment plan, funds are debited from your available balance and assigned to our quantitative market-making vault. On maturity, principal and target returns are credited back to your balance.',
    },
    {
      q: 'Are returns guaranteed?',
      a: 'No. CEX Network adheres strictly to transparent financial governance. Returns reflect genuine market arbitrage, liquidity fees, and trading performance. Risk disclosures apply to all plans.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Help Center & Support Desk</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">Get 24/7 assistance from our client support team.</p>
      </div>

      {/* WhatsApp Quick Channel Banner */}
      {siteSettings?.supportWhatsApp && (
        <div className="rounded-3xl glass-card p-6 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Instant WhatsApp Concierge Desk</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chat directly with our support specialists: {siteSettings.supportWhatsApp}
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${siteSettings.supportWhatsApp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow"
          >
            <span>Open WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Submission Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Create a Support Ticket</span>
          </h3>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
              Support ticket created! Our team will respond shortly.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your inquiry"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Deposit Query">Deposit Query</option>
                  <option value="Withdrawal Issue">Withdrawal Issue</option>
                  <option value="KYC Verification">KYC Verification</option>
                  <option value="Investment Plan">Investment Plan</option>
                  <option value="General Support">General Support</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Standard</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Explain your issue in detail..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                required
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
          >
            {submitting ? 'Submitting Ticket...' : 'Dispatch Ticket'}
          </button>
        </form>

        {/* Existing Tickets List */}
        <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Your Support Correspondence</span>
            <span className="text-[10px] font-mono">{tickets.length} Records</span>
          </h3>

          {loadingTickets ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No previous support tickets found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{t.subject}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.status === 'resolved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{t.message}</p>
                  {t.adminResponse && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-cyan-200">
                      <strong className="text-cyan-400 block mb-0.5">Admin Response:</strong>
                      {t.adminResponse}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono block text-right">
                    {formatDate(t.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-hidden">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-white hover:text-cyan-400 transition-colors"
              >
                <span>{faq.q}</span>
                {openFaqIndex === idx ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {openFaqIndex === idx && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
