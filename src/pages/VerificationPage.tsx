import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  AlertCircle,
  FileText,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitKycVerification } from '../services/userService';

export const VerificationPage: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [docType, setDocType] = useState('CNIC');
  const [docNumber, setDocNumber] = useState('');
  const [legalName, setLegalName] = useState(userProfile?.displayName || '');
  const [docPhotoBase64, setDocPhotoBase64] = useState('');
  const [photoName, setPhotoName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const status = userProfile?.verificationStatus || 'unverified';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Document photo must be under 2MB');
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocPhotoBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!docNumber.trim()) {
      setError('Please provide document / CNIC number');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const details = JSON.stringify({
        docType,
        docNumber: docNumber.trim(),
        legalName: legalName.trim(),
        hasPhoto: !!docPhotoBase64,
        submittedAt: new Date().toISOString(),
      });

      await submitKycVerification(currentUser.uid, details);
      await refreshProfile();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Identity Verification (KYC)</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Verify your legal identity to unlock unlimited banking withdrawals and institutional allocations.
        </p>
      </div>

      {/* Current Status Box */}
      <div className={`p-6 rounded-3xl border flex items-start gap-4 ${
        status === 'approved'
          ? 'bg-emerald-950/20 border-emerald-800/40'
          : status === 'pending'
          ? 'bg-amber-950/20 border-amber-800/40'
          : status === 'rejected'
          ? 'bg-rose-950/20 border-rose-800/40'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className={`p-3 rounded-2xl ${
          status === 'approved'
            ? 'bg-emerald-950 text-emerald-400'
            : status === 'pending'
            ? 'bg-amber-950 text-amber-400'
            : status === 'rejected'
            ? 'bg-rose-950 text-rose-400'
            : 'bg-slate-800 text-slate-400'
        }`}>
          {status === 'approved' ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : status === 'pending' ? (
            <Clock className="w-6 h-6" />
          ) : status === 'rejected' ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <ShieldCheck className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white capitalize">Status: {status}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              status === 'approved'
                ? 'bg-emerald-900 text-emerald-300'
                : status === 'pending'
                ? 'bg-amber-900 text-amber-300'
                : 'bg-slate-800 text-slate-300'
            }`}>
              Tier 1
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {status === 'approved'
              ? 'Your identity documents have been approved by the compliance department. Your account is fully verified.'
              : status === 'pending'
              ? 'Your documents have been submitted and are in the review queue. Compliance turnaround is typically under 2 hours.'
              : status === 'rejected'
              ? 'Your previous submission was not approved. Please review your details and re-submit a clear document copy.'
              : 'Submit a copy of your National ID (CNIC) or Passport to verify your account.'}
          </p>
        </div>
      </div>

      {/* Form (only shown if unverified or rejected) */}
      {(status === 'unverified' || status === 'rejected') && (
        <form onSubmit={handleSubmit} className="rounded-3xl glass-card p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
            Submit Identification Proof
          </h3>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
              Identity documents submitted for review!
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="CNIC">National Identity Card (CNIC / Smart Card)</option>
                <option value="Passport">International Passport</option>
                <option value="DriverLicense">Driving License</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Full Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Name as printed on ID"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Document / CNIC Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="e.g. 42101-1234567-1"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Upload Front ID Photo (Optional or Reference)
              </label>
              <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/40 hover:bg-slate-950 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-300">
                  {photoName ? photoName : 'Click to select ID photo or document scan'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, PDF up to 2MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting for Audit...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Submit Identification for Verification</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
