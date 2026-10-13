import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  setDoc,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  DepositRequest,
  WithdrawalRequest,
  UserPlan,
  LedgerEntry,
  SupportTicket,
  NotificationItem,
} from '../types';

export async function submitDepositRequest(params: {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  amountPkr: number;
  paymentMethodId: string;
  paymentMethodName: string;
  transactionRef: string;
  receiptUrl?: string;
}): Promise<string> {
  const depositId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const depositRef = doc(db, 'deposits', depositId);

  const newDeposit: DepositRequest = {
    id: depositId,
    userId: params.userId,
    userEmail: params.userEmail,
    userDisplayName: params.userDisplayName || 'Investor',
    amountPkr: params.amountPkr,
    paymentMethodId: params.paymentMethodId,
    paymentMethodName: params.paymentMethodName,
    transactionRef: params.transactionRef,
    receiptUrl: params.receiptUrl || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(depositRef, newDeposit);

    // Create user notification
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: 'Deposit Submitted',
      message: `Your deposit of PKR ${params.amountPkr.toLocaleString()} via ${params.paymentMethodName} has been submitted and is pending verification.`,
      type: 'financial',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return depositId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'deposits');
  }
}

export async function submitWithdrawalRequest(params: {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  amountPkr: number;
  feePkr: number;
  paymentMethod: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
}): Promise<string> {
  const withdrawalId = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userRef = doc(db, 'users', params.userId);
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ledgerRef = doc(db, 'ledgerEntries', ledgerId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data();
      const currentBalance = Number(userData.balancePkr || 0);

      if (currentBalance < params.amountPkr) {
        throw new Error(`Insufficient balance. Available: PKR ${currentBalance.toLocaleString()}, Requested: PKR ${params.amountPkr.toLocaleString()}`);
      }

      const newBalance = currentBalance - params.amountPkr;
      const currentPending = Number(userData.pendingBalancePkr || 0);
      const newPending = currentPending + params.amountPkr;

      // 1. Reserve funds safely
      tx.update(userRef, {
        balancePkr: newBalance,
        pendingBalancePkr: newPending,
        updatedAt: new Date().toISOString(),
      });

      // 2. Create pending withdrawal record
      const newWithdrawal: WithdrawalRequest = {
        id: withdrawalId,
        userId: params.userId,
        userEmail: params.userEmail,
        userDisplayName: params.userDisplayName || 'Investor',
        amountPkr: params.amountPkr,
        feePkr: params.feePkr,
        netAmountPkr: params.amountPkr - params.feePkr,
        paymentMethod: params.paymentMethod,
        accountTitle: params.accountTitle,
        accountNumber: params.accountNumber,
        bankName: params.bankName || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tx.set(withdrawalRef, newWithdrawal);

      // 3. Create pending ledger entry
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        userId: params.userId,
        type: 'withdrawal',
        amountPkr: -params.amountPkr,
        balanceBeforePkr: currentBalance,
        balanceAfterPkr: newBalance,
        status: 'pending',
        referenceId: withdrawalId,
        description: `Withdrawal request of PKR ${params.amountPkr.toLocaleString()} to ${params.paymentMethod} (${params.accountTitle})`,
        createdBy: params.userId,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledgerEntry);
    });

    // Notify user
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: 'Withdrawal Queued',
      message: `Your withdrawal request of PKR ${params.amountPkr.toLocaleString()} is queued for processing. Funds are held in escrow.`,
      type: 'financial',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return withdrawalId;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient balance')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, 'withdrawals');
  }
}

export async function investInPlan(params: {
  userId: string;
  userEmail: string;
  planId: string;
  planTitle: string;
  investAmountPkr: number;
  expectedReturnRate: number;
  durationDays: number;
}): Promise<string> {
  const userPlanId = `uplan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userRef = doc(db, 'users', params.userId);
  const userPlanRef = doc(db, 'userPlans', userPlanId);
  const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ledgerRef = doc(db, 'ledgerEntries', ledgerId);

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
  const expectedReturnPkr = params.investAmountPkr + (params.investAmountPkr * (params.expectedReturnRate / 100));

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User account not found');
      }

      const userData = userSnap.data();
      const currentBalance = Number(userData.balancePkr || 0);

      if (currentBalance < params.investAmountPkr) {
        throw new Error(`Insufficient available balance. You have PKR ${currentBalance.toLocaleString()}, but this plan requires PKR ${params.investAmountPkr.toLocaleString()}`);
      }

      const newBalance = currentBalance - params.investAmountPkr;
      const currentInvested = Number(userData.activeInvestedPkr || 0);
      const newInvested = currentInvested + params.investAmountPkr;

      // 1. Debit user balance and credit active invested
      tx.update(userRef, {
        balancePkr: newBalance,
        activeInvestedPkr: newInvested,
        updatedAt: new Date().toISOString(),
      });

      // 2. Create user active plan
      const userPlan: UserPlan = {
        id: userPlanId,
        userId: params.userId,
        userEmail: params.userEmail,
        planId: params.planId,
        planTitle: params.planTitle,
        investedAmountPkr: params.investAmountPkr,
        expectedReturnPkr,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tx.set(userPlanRef, userPlan);

      // 3. Create ledger entry
      const ledger: LedgerEntry = {
        id: ledgerId,
        userId: params.userId,
        type: 'investment',
        amountPkr: -params.investAmountPkr,
        balanceBeforePkr: currentBalance,
        balanceAfterPkr: newBalance,
        status: 'completed',
        referenceId: userPlanId,
        description: `Subscribed to ${params.planTitle} (${params.durationDays} Days Term)`,
        createdBy: params.userId,
        createdAt: new Date().toISOString(),
      };
      tx.set(ledgerRef, ledger);
    });

    // Notify user
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: 'Plan Activated',
      message: `You successfully committed PKR ${params.investAmountPkr.toLocaleString()} to ${params.planTitle}.`,
      type: 'financial',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return userPlanId;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient available balance')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, 'userPlans');
  }
}

export async function submitSupportTicket(params: {
  userId: string;
  userEmail: string;
  subject: string;
  category: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ticketRef = doc(db, 'supportTickets', ticketId);

  const ticket: SupportTicket = {
    id: ticketId,
    userId: params.userId,
    userEmail: params.userEmail,
    subject: params.subject,
    category: params.category,
    message: params.message,
    status: 'open',
    priority: params.priority || 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(ticketRef, ticket);
    return ticketId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'supportTickets');
  }
}

export async function submitKycVerification(userId: string, docDetails: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      verificationStatus: 'pending',
      verificationDoc: docDetails,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}
