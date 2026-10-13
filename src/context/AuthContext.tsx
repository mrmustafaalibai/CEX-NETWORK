import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, googleProvider, db, BOOTSTRAP_ADMIN_EMAIL } from '../lib/firebase';
import { UserProfile } from '../types';
import { ensureDefaultPlatformData } from '../services/seedService';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string, referralCode?: string) => Promise<void>;
  loginWithGoogle: (referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to generate unique referral code
  const generateReferralCode = () => {
    return 'CEX' + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const syncOrCreateUserProfile = async (user: FirebaseUser, inviterCode?: string, overrideName?: string) => {
    const userRef = doc(db, 'users', user.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (err) {
      console.warn('Error reading user profile:', err);
    }

    const isSuperAdminEmail = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    if (!snap || !snap.exists()) {
      // New user registration
      const newRefCode = generateReferralCode();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: overrideName || user.displayName || user.email?.split('@')[0] || 'Investor',
        role: isSuperAdminEmail ? 'admin' : 'user',
        status: 'active',
        referralCode: newRefCode,
        referredBy: inviterCode || '',
        balancePkr: 0,
        pendingBalancePkr: 0,
        totalDepositedPkr: 0,
        totalWithdrawnPkr: 0,
        activeInvestedPkr: 0,
        verifiedReferralCount: 0,
        isVerified: false,
        verificationStatus: 'unverified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, profile);

        // If referred by someone, record in referrals collection
        if (inviterCode) {
          const q = query(collection(db, 'users'), where('referralCode', '==', inviterCode.trim().toUpperCase()));
          const refSnaps = await getDocs(q);
          if (!refSnaps.empty) {
            const referrerDoc = refSnaps.docs[0];
            const referrerId = referrerDoc.id;
            if (referrerId !== user.uid) {
              const refId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              await setDoc(doc(db, 'referrals', refId), {
                id: refId,
                referrerId,
                referrerCode: inviterCode.trim().toUpperCase(),
                refereeId: user.uid,
                refereeEmail: user.email || '',
                refereeName: profile.displayName,
                status: 'active',
                bonusEligible: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to create user profile:', err);
      }
    }

    // Check admin rights
    let userHasAdmin = isSuperAdminEmail;
    if (!userHasAdmin) {
      try {
        const adminCheck = await getDoc(doc(db, 'admins', user.uid));
        userHasAdmin = adminCheck.exists();
      } catch {
        userHasAdmin = false;
      }
    }
    setIsAdmin(userHasAdmin);

    // Only ensure platform seed & admin record if user has admin privileges
    if (userHasAdmin || isSuperAdminEmail) {
      await ensureDefaultPlatformData(user.uid, user.email || '', userHasAdmin);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncOrCreateUserProfile(user);

        // Attach real-time snapshot listener on user's profile
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          },
          (error) => {
            console.error('User profile subscription error:', error);
          }
        );

        // Also listen to admin status
        if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
        } else {
          const adminRef = doc(db, 'admins', user.uid);
          getDoc(adminRef).then((adm) => setIsAdmin(adm.exists())).catch(() => setIsAdmin(false));
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await syncOrCreateUserProfile(cred.user);
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    referralCode?: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await syncOrCreateUserProfile(cred.user, referralCode, displayName);
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // verification email attempt logged
    }
  };

  const loginWithGoogle = async (referralCode?: string) => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncOrCreateUserProfile(cred.user, referralCode);
  };

  const logout = async () => {
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
