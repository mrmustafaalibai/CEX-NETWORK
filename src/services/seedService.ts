import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db, BOOTSTRAP_ADMIN_EMAIL } from '../lib/firebase';
import { PaymentMethodConfig, InvestmentPlan, SiteSettings } from '../types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'CEX Network',
  supportWhatsApp: '+92 300 1234567',
  supportEmail: 'support@cexnetwork.finance',
  minWithdrawalPkr: 1000,
  maxWithdrawalPkr: 500000,
  withdrawalFeePercent: 0,
  referralRewardPercent: 5,
  isInvestmentSettlementEnabled: true,
  announcementBanner: 'Welcome to CEX Network. Institutional liquidity and transparent financial execution.',
  welcomeNotice: 'Instant automated deposits via Easypaisa, JazzCash & Banking channels are active.',
  riskDisclosure: 'Trading and financial instruments involve market risk. Capital preservation protocols apply. Past performance is not indicative of future yield.',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'method_easypaisa',
    name: 'Easypaisa Mobile Account',
    type: 'easypaisa',
    accountTitle: 'CEX Network Escrow',
    accountNumber: '0345 8829104',
    bankName: 'Telenor Microfinance Bank',
    instructions: 'Send exact funds via Easypaisa mobile app. Take a screenshot of the receipt and note the 11-digit Transaction ID (TID) to submit below.',
    minDepositPkr: 1000,
    maxDepositPkr: 250000,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'method_jazzcash',
    name: 'JazzCash Wallet',
    type: 'jazzcash',
    accountTitle: 'CEX Network Vault',
    accountNumber: '0301 9482103',
    bankName: 'Mobilink Microfinance Bank',
    instructions: 'Transfer funds using JazzCash app or USSD *786#. Keep your Transaction ID (TID) ready and upload clear payment receipt.',
    minDepositPkr: 1000,
    maxDepositPkr: 250000,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'method_bank',
    name: 'Meezan Bank Raast / IBAN',
    type: 'bank',
    accountTitle: 'CEX Network Capital Holdings',
    accountNumber: '01010102938481',
    bankName: 'Meezan Bank Ltd (Raast Enabled)',
    instructions: 'Transfer funds via any Pakistani Bank App or Raast Instant P2P. Provide the 12-digit UTR/Reference number for immediate verification.',
    minDepositPkr: 5000,
    maxDepositPkr: 5000000,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'method_usdt',
    name: 'USDT (TRC20 / BEP20)',
    type: 'crypto',
    accountTitle: 'CEX Multi-Sig Hot Wallet',
    accountNumber: 'TXY9aK8L2pM3mN8bQ4rS1vW6zX5tE7uI8o',
    bankName: 'Tron / BSC Network (Rate: 1 USDT = 280 PKR)',
    instructions: 'Deposit USDT on Tron (TRC-20) network. Copy transaction hash (TxHash) and submit with proof.',
    minDepositPkr: 10000,
    maxDepositPkr: 10000000,
    isActive: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'plan_starter',
    title: 'Starter Liquidity Pool',
    description: 'Short-term capital allocation in institutional liquidity pools. Ideal for platform onboarding and risk testing.',
    minAmountPkr: 2000,
    maxAmountPkr: 50000,
    durationDays: 7,
    expectedReturnRate: 3.5, // 3.5% over 7 days
    returnMethod: 'Principal + Yield returned on maturity',
    status: 'active',
    riskLevel: 'Low',
    terms: 'Principal locked for 7 days. Early withdrawal penalty 5%. Risk disclosure applies.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_standard',
    title: 'Arbitrage & Market Maker Vault',
    description: 'Algorithmic spot-futures market making and multi-exchange spread arbitrage across top digital asset pairs.',
    minAmountPkr: 10000,
    maxAmountPkr: 500000,
    durationDays: 30,
    expectedReturnRate: 15.0, // 15% over 30 days
    returnMethod: 'Weekly ledger accounting with 30-day principal release',
    status: 'active',
    riskLevel: 'Moderate',
    terms: 'Capital committed for 30 days. Transparent performance reporting. Loss mitigations via hedged orders.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_institutional',
    title: 'Institutional Yield Strategy',
    description: 'High-tier delta-neutral quantitative investment pool for high net-worth traders and syndicate participants.',
    minAmountPkr: 100000,
    maxAmountPkr: 5000000,
    durationDays: 90,
    expectedReturnRate: 48.0, // 48% over 90 days
    returnMethod: 'Bi-weekly accounting with priority payout queue',
    status: 'active',
    riskLevel: 'Moderate',
    terms: '90-day lock period. Dedicated portfolio manager and verified audit trail.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function ensureDefaultPlatformData(currentUid?: string, currentEmail?: string, isAdminUser?: boolean) {
  if (!currentUid) return;

  const isBootstrapAdmin = Boolean(
    currentEmail && currentEmail.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );

  // Security & Permission Enforcement:
  // Non-admin regular users cannot and should not write to admin-protected collections.
  // Only proceed with database seeding if the authenticated user has verified admin privileges.
  if (!isBootstrapAdmin && !isAdminUser) {
    return;
  }

  try {
    // 1. Ensure Admin Document if current user is bootstrap admin
    if (isBootstrapAdmin) {
      const adminRef = doc(db, 'admins', currentUid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: currentUid,
          email: currentEmail,
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 2. Ensure Site Settings
    const settingsRef = doc(db, 'siteSettings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, DEFAULT_SITE_SETTINGS);
    }

    // 3. Ensure Default Payment Methods if collection is empty
    const payMethodsSnap = await getDocs(collection(db, 'paymentMethods'));
    if (payMethodsSnap.empty) {
      for (const m of DEFAULT_PAYMENT_METHODS) {
        await setDoc(doc(db, 'paymentMethods', m.id), m);
      }
    }

    // 4. Ensure Default Investment Plans if collection is empty
    const plansSnap = await getDocs(collection(db, 'plans'));
    if (plansSnap.empty) {
      for (const p of DEFAULT_INVESTMENT_PLANS) {
        await setDoc(doc(db, 'plans', p.id), p);
      }
    }
  } catch (err) {
    // Gracefully handle without throwing unhandled exceptions to UI
    console.warn('Notice: platform configuration initialization check:', err);
  }
}
