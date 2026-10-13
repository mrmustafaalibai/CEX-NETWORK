export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  referralCode: string;
  referredBy?: string;
  balancePkr: number;
  pendingBalancePkr: number;
  totalDepositedPkr: number;
  totalWithdrawnPkr: number;
  activeInvestedPkr: number;
  verifiedReferralCount: number;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationDoc?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  amountPkr: number;
  paymentMethodId: string;
  paymentMethodName: string;
  transactionRef: string;
  receiptUrl?: string;
  status: DepositStatus;
  adminRemarks?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'rejected' | 'cancelled';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  amountPkr: number;
  feePkr: number;
  netAmountPkr: number;
  paymentMethod: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  status: WithdrawalStatus;
  adminRemarks?: string;
  payoutRef?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentPlan {
  id: string;
  title: string;
  description: string;
  minAmountPkr: number;
  maxAmountPkr: number;
  durationDays: number;
  expectedReturnRate: number; // Percentage
  returnMethod: string;
  status: 'active' | 'inactive' | 'closed';
  riskLevel: 'Low' | 'Moderate' | 'High';
  terms: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlan {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planTitle: string;
  investedAmountPkr: number;
  expectedReturnPkr: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LedgerType = 'deposit' | 'withdrawal' | 'investment' | 'settlement' | 'commission' | 'adjustment';
export type LedgerStatus = 'completed' | 'pending' | 'reversed';

export interface LedgerEntry {
  id: string;
  userId: string;
  type: LedgerType;
  amountPkr: number;
  balanceBeforePkr: number;
  balanceAfterPkr: number;
  status: LedgerStatus;
  referenceId?: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerCode: string;
  refereeId: string;
  refereeEmail: string;
  refereeName: string;
  status: 'active' | 'verified';
  bonusEligible: boolean;
  createdAt: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'bank' | 'easypaisa' | 'jazzcash' | 'crypto';
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  instructions: string;
  minDepositPkr: number;
  maxDepositPkr: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  siteName: string;
  supportWhatsApp: string;
  supportEmail: string;
  minWithdrawalPkr: number;
  maxWithdrawalPkr: number;
  withdrawalFeePercent: number;
  referralRewardPercent: number;
  isInvestmentSettlementEnabled: boolean;
  announcementBanner: string;
  welcomeNotice: string;
  riskDisclosure: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // user uid or 'all'
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'financial';
  isRead: boolean;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetCollection: string;
  targetId: string;
  details: string;
  createdAt: string;
}
