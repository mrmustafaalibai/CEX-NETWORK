import {
  collection,
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  DepositRequest,
  WithdrawalRequest,
  LedgerEntry,
  AdminAuditLog,
  InvestmentPlan,
  PaymentMethodConfig,
  SiteSettings,
  NotificationItem,
} from '../types';

export async function approveDeposit(params: {
  depositId: string;
  adminUid: string;
  adminEmail: string;
  remarks?: string;
}): Promise<void> {
  const depositRef = doc(db, 'deposits', params.depositId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditRef = doc(db, 'adminAuditLogs', auditId);

  try {
    let targetUserId = '';
    let creditedAmount = 0;

    await runTransaction(db, async (tx) => {
      const depSnap = await tx.get(depositRef);
      if (!depSnap.exists()) {
        throw new Error('Deposit record not found');
      }

      const depData = depSnap.data() as DepositRequest;
      if (depData.status !== 'pending') {
        throw new Error(`Cannot approve deposit with status "${depData.status}". Only pending deposits can be approved.`);
      }

      targetUserId = depData.userId;
      creditedAmount = depData.amountPkr;
      const userRef = doc(db, 'users', depData.userId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('Associated user profile not found');
      }

      const userData = userSnap.data();
      const currentBalance = Number(userData.balancePkr || 0);
      const currentDeposited = Number(userData.totalDepositedPkr || 0);
      const newBalance = currentBalance + depData.amountPkr;
      const newDeposited = currentDeposited + depData.amountPkr;

      // 1. Mark deposit approved
      tx.update(depositRef, {
        status: 'approved',
        adminRemarks: params.remarks || 'Deposit verified and credited by administration.',
        processedBy: params.adminUid,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Credit user's available balance atomically
      tx.update(userRef, {
        balancePkr: newBalance,
        totalDepositedPkr: newDeposited,
        updatedAt: new Date().toISOString(),
      });

      // 3. Create immutable ledger record
      const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ledgerRef = doc(db, 'ledgerEntries', ledgerId);
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        userId: depData.userId,
        type: 'deposit',
        amountPkr: depData.amountPkr,
        balanceBeforePkr: currentBalance,
        balanceAfterPkr: newBalance,
        status: 'completed',
        referenceId: params.depositId,
        description: `Approved deposit via ${depData.paymentMethodName} (Ref: ${depData.transactionRef})`,
        createdBy: params.adminUid,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledgerEntry);

      // 4. Record audit log
      const auditLog: AdminAuditLog = {
        id: auditId,
        adminId: params.adminUid,
        adminEmail: params.adminEmail,
        action: 'APPROVE_DEPOSIT',
        targetCollection: 'deposits',
        targetId: params.depositId,
        details: `Approved PKR ${depData.amountPkr.toLocaleString()} for user ${depData.userId} (${depData.userEmail}). Ref: ${depData.transactionRef}`,
        createdAt: new Date().toISOString(),
      };
      tx.set(auditRef, auditLog);
    });

    // Notify user of credited balance
    if (targetUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUserId,
        title: 'Deposit Approved & Credited',
        message: `Your deposit of PKR ${creditedAmount.toLocaleString()} has been approved and added to your available balance.`,
        type: 'success',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${params.depositId}`);
  }
}

export async function rejectDeposit(params: {
  depositId: string;
  adminUid: string;
  adminEmail: string;
  remarks: string;
}): Promise<void> {
  const depositRef = doc(db, 'deposits', params.depositId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditRef = doc(db, 'adminAuditLogs', auditId);

  try {
    let targetUserId = '';
    let amount = 0;

    await runTransaction(db, async (tx) => {
      const depSnap = await tx.get(depositRef);
      if (!depSnap.exists()) {
        throw new Error('Deposit record not found');
      }

      const depData = depSnap.data() as DepositRequest;
      if (depData.status !== 'pending') {
        throw new Error(`Cannot reject deposit with status "${depData.status}". Only pending deposits can be rejected.`);
      }

      targetUserId = depData.userId;
      amount = depData.amountPkr;

      tx.update(depositRef, {
        status: 'rejected',
        adminRemarks: params.remarks,
        processedBy: params.adminUid,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const auditLog: AdminAuditLog = {
        id: auditId,
        adminId: params.adminUid,
        adminEmail: params.adminEmail,
        action: 'REJECT_DEPOSIT',
        targetCollection: 'deposits',
        targetId: params.depositId,
        details: `Rejected deposit of PKR ${depData.amountPkr.toLocaleString()} for user ${depData.userId}. Reason: ${params.remarks}`,
        createdAt: new Date().toISOString(),
      };
      tx.set(auditRef, auditLog);
    });

    if (targetUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUserId,
        title: 'Deposit Rejected',
        message: `Your deposit request of PKR ${amount.toLocaleString()} was rejected. Reason: ${params.remarks}`,
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${params.depositId}`);
  }
}

export async function markWithdrawalPaid(params: {
  withdrawalId: string;
  adminUid: string;
  adminEmail: string;
  payoutRef: string;
  remarks?: string;
}): Promise<void> {
  const withdrawalRef = doc(db, 'withdrawals', params.withdrawalId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditRef = doc(db, 'adminAuditLogs', auditId);

  try {
    let targetUserId = '';
    let netAmount = 0;

    await runTransaction(db, async (tx) => {
      const wdrSnap = await tx.get(withdrawalRef);
      if (!wdrSnap.exists()) {
        throw new Error('Withdrawal request not found');
      }

      const wdrData = wdrSnap.data() as WithdrawalRequest;
      if (wdrData.status === 'paid' || wdrData.status === 'rejected') {
        throw new Error(`Withdrawal is already in terminal status "${wdrData.status}".`);
      }

      targetUserId = wdrData.userId;
      netAmount = wdrData.netAmountPkr;
      const userRef = doc(db, 'users', wdrData.userId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data();
      const currentPending = Number(userData.pendingBalancePkr || 0);
      const newPending = Math.max(0, currentPending - wdrData.amountPkr);
      const currentWithdrawn = Number(userData.totalWithdrawnPkr || 0);
      const newWithdrawn = currentWithdrawn + wdrData.amountPkr;

      // 1. Mark paid
      tx.update(withdrawalRef, {
        status: 'paid',
        payoutRef: params.payoutRef,
        adminRemarks: params.remarks || 'Payout executed successfully via banking rails.',
        processedBy: params.adminUid,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Finalize user ledger: release reservation and increment total withdrawn
      tx.update(userRef, {
        pendingBalancePkr: newPending,
        totalWithdrawnPkr: newWithdrawn,
        updatedAt: new Date().toISOString(),
      });

      // 3. Create completed ledger confirmation
      const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ledgerRef = doc(db, 'ledgerEntries', ledgerId);
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        userId: wdrData.userId,
        type: 'withdrawal',
        amountPkr: -wdrData.amountPkr,
        balanceBeforePkr: Number(userData.balancePkr || 0),
        balanceAfterPkr: Number(userData.balancePkr || 0),
        status: 'completed',
        referenceId: params.withdrawalId,
        description: `Disbursed PKR ${wdrData.netAmountPkr.toLocaleString()} to ${wdrData.paymentMethod} (${wdrData.accountNumber}). Payout Ref: ${params.payoutRef}`,
        createdBy: params.adminUid,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledgerEntry);

      // 4. Audit Log
      const auditLog: AdminAuditLog = {
        id: auditId,
        adminId: params.adminUid,
        adminEmail: params.adminEmail,
        action: 'PAYOUT_WITHDRAWAL',
        targetCollection: 'withdrawals',
        targetId: params.withdrawalId,
        details: `Disbursed PKR ${wdrData.amountPkr.toLocaleString()} to ${wdrData.userEmail}. Payout Ref: ${params.payoutRef}`,
        createdAt: new Date().toISOString(),
      };
      tx.set(auditRef, auditLog);
    });

    if (targetUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUserId,
        title: 'Withdrawal Disbursed',
        message: `Your withdrawal of PKR ${netAmount.toLocaleString()} has been sent to your account. Bank Ref: ${params.payoutRef}`,
        type: 'success',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${params.withdrawalId}`);
  }
}

export async function rejectWithdrawal(params: {
  withdrawalId: string;
  adminUid: string;
  adminEmail: string;
  remarks: string;
}): Promise<void> {
  const withdrawalRef = doc(db, 'withdrawals', params.withdrawalId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditRef = doc(db, 'adminAuditLogs', auditId);

  try {
    let targetUserId = '';
    let refundAmount = 0;

    await runTransaction(db, async (tx) => {
      const wdrSnap = await tx.get(withdrawalRef);
      if (!wdrSnap.exists()) {
        throw new Error('Withdrawal request not found');
      }

      const wdrData = wdrSnap.data() as WithdrawalRequest;
      if (wdrData.status === 'paid' || wdrData.status === 'rejected') {
        throw new Error(`Withdrawal is already in terminal status "${wdrData.status}".`);
      }

      targetUserId = wdrData.userId;
      refundAmount = wdrData.amountPkr;
      const userRef = doc(db, 'users', wdrData.userId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data();
      const currentBalance = Number(userData.balancePkr || 0);
      const currentPending = Number(userData.pendingBalancePkr || 0);

      // Safe release: Return reserved funds back to available balance
      const restoredBalance = currentBalance + wdrData.amountPkr;
      const restoredPending = Math.max(0, currentPending - wdrData.amountPkr);

      tx.update(withdrawalRef, {
        status: 'rejected',
        adminRemarks: params.remarks,
        processedBy: params.adminUid,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      tx.update(userRef, {
        balancePkr: restoredBalance,
        pendingBalancePkr: restoredPending,
        updatedAt: new Date().toISOString(),
      });

      // Audit and ledger record
      const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ledgerRef = doc(db, 'ledgerEntries', ledgerId);
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        userId: wdrData.userId,
        type: 'adjustment',
        amountPkr: wdrData.amountPkr,
        balanceBeforePkr: currentBalance,
        balanceAfterPkr: restoredBalance,
        status: 'completed',
        referenceId: params.withdrawalId,
        description: `Refunded reserved withdrawal of PKR ${wdrData.amountPkr.toLocaleString()}. Reason: ${params.remarks}`,
        createdBy: params.adminUid,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledgerEntry);

      const auditLog: AdminAuditLog = {
        id: auditId,
        adminId: params.adminUid,
        adminEmail: params.adminEmail,
        action: 'REJECT_WITHDRAWAL',
        targetCollection: 'withdrawals',
        targetId: params.withdrawalId,
        details: `Rejected withdrawal of PKR ${wdrData.amountPkr.toLocaleString()} for user ${wdrData.userId}. Reserved funds restored. Reason: ${params.remarks}`,
        createdAt: new Date().toISOString(),
      };
      tx.set(auditRef, auditLog);
    });

    if (targetUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetUserId,
        title: 'Withdrawal Rejected & Funds Returned',
        message: `Your withdrawal of PKR ${refundAmount.toLocaleString()} was rejected and the funds have been safely returned to your available balance. Reason: ${params.remarks}`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${params.withdrawalId}`);
  }
}

export async function adjustUserBalance(params: {
  userId: string;
  adminUid: string;
  adminEmail: string;
  amountDeltaPkr: number;
  reason: string;
}): Promise<void> {
  const userRef = doc(db, 'users', params.userId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditRef = doc(db, 'adminAuditLogs', auditId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const currentBalance = Number(userData.balancePkr || 0);
      const newBalance = currentBalance + params.amountDeltaPkr;

      if (newBalance < 0) {
        throw new Error(`Adjustment would result in negative balance (Current: ${currentBalance}, Delta: ${params.amountDeltaPkr})`);
      }

      tx.update(userRef, {
        balancePkr: newBalance,
        updatedAt: new Date().toISOString(),
      });

      const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ledgerRef = doc(db, 'ledgerEntries', ledgerId);
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        userId: params.userId,
        type: 'adjustment',
        amountPkr: params.amountDeltaPkr,
        balanceBeforePkr: currentBalance,
        balanceAfterPkr: newBalance,
        status: 'completed',
        description: `Manual administrative balance adjustment: ${params.reason}`,
        createdBy: params.adminUid,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledgerEntry);

      const auditLog: AdminAuditLog = {
        id: auditId,
        adminId: params.adminUid,
        adminEmail: params.adminEmail,
        action: 'MANUAL_BALANCE_ADJUSTMENT',
        targetCollection: 'users',
        targetId: params.userId,
        details: `Adjusted balance by ${params.amountDeltaPkr > 0 ? '+' : ''}PKR ${params.amountDeltaPkr.toLocaleString()} for user ${params.userId}. Reason: ${params.reason}`,
        createdAt: new Date().toISOString(),
      };
      tx.set(auditRef, auditLog);
    });

    // Notify user
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: 'Balance Adjustment',
      message: `An administrative adjustment of PKR ${params.amountDeltaPkr.toLocaleString()} was applied to your account. Note: ${params.reason}`,
      type: 'financial',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${params.userId}`);
  }
}

export async function toggleUserStatus(params: {
  userId: string;
  adminUid: string;
  adminEmail: string;
  newStatus: 'active' | 'suspended';
  reason: string;
}): Promise<void> {
  const userRef = doc(db, 'users', params.userId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await updateDoc(userRef, {
      status: params.newStatus,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'adminAuditLogs', auditId), {
      id: auditId,
      adminId: params.adminUid,
      adminEmail: params.adminEmail,
      action: params.newStatus === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
      targetCollection: 'users',
      targetId: params.userId,
      details: `User status changed to ${params.newStatus}. Reason: ${params.reason}`,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${params.userId}`);
  }
}

export async function updateKycStatus(params: {
  userId: string;
  adminUid: string;
  adminEmail: string;
  verificationStatus: 'approved' | 'rejected';
  reason: string;
}): Promise<void> {
  const userRef = doc(db, 'users', params.userId);
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    await updateDoc(userRef, {
      verificationStatus: params.verificationStatus,
      isVerified: params.verificationStatus === 'approved',
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'adminAuditLogs', auditId), {
      id: auditId,
      adminId: params.adminUid,
      adminEmail: params.adminEmail,
      action: 'UPDATE_KYC_STATUS',
      targetCollection: 'users',
      targetId: params.userId,
      details: `KYC verification status changed to ${params.verificationStatus}. Reason: ${params.reason}`,
      createdAt: new Date().toISOString(),
    });

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: params.verificationStatus === 'approved' ? 'KYC Verified' : 'KYC Review Notice',
      message: params.verificationStatus === 'approved'
        ? 'Your identity documents have been approved by the compliance team.'
        : `Your identity verification was not approved: ${params.reason}`,
      type: params.verificationStatus === 'approved' ? 'success' : 'warning',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${params.userId}`);
  }
}

export async function saveInvestmentPlan(plan: InvestmentPlan): Promise<void> {
  try {
    await setDoc(doc(db, 'plans', plan.id), {
      ...plan,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `plans/${plan.id}`);
  }
}

export async function deleteInvestmentPlan(planId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `plans/${planId}`);
  }
}

export async function savePaymentMethod(method: PaymentMethodConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'paymentMethods', method.id), {
      ...method,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `paymentMethods/${method.id}`);
  }
}

export async function deletePaymentMethod(methodId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'paymentMethods', methodId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `paymentMethods/${methodId}`);
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  try {
    await updateDoc(doc(db, 'siteSettings', 'global'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'siteSettings/global');
  }
}

export async function replySupportTicket(params: {
  ticketId: string;
  response: string;
  status: 'in_progress' | 'resolved' | 'closed';
  adminUid: string;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'supportTickets', params.ticketId), {
      adminResponse: params.response,
      status: params.status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${params.ticketId}`);
  }
}

export async function broadcastNotification(params: {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'financial';
  targetUserId: string; // 'all' or specific uid
  adminUid: string;
}): Promise<void> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.targetUserId,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'notifications');
  }
}
