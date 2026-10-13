import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';

import { HomeDashboard } from './pages/HomeDashboard';
import { DepositPage } from './pages/DepositPage';
import { DepositHistoryPage } from './pages/DepositHistoryPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { WithdrawalHistoryPage } from './pages/WithdrawalHistoryPage';
import { PlansPage } from './pages/PlansPage';
import { MyPlansPage } from './pages/MyPlansPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TeamPage } from './pages/TeamPage';
import { ProfilePage } from './pages/ProfilePage';
import { VerificationPage } from './pages/VerificationPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminPage } from './pages/admin/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { BrandLogo } from './components/BrandLogo';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin,
}) => {
  const { currentUser, userProfile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06090e] flex flex-col items-center justify-center space-y-4">
        <BrandLogo size="xl" showText={false} />
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying CEX Network Session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl glass-card p-8 border border-rose-800/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Suspended</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your account has been placed on administrative hold pending security review. Please contact support desk to resolve any discrepancies.
          </p>
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
          >
            <span>Contact Support Desk</span>
          </Link>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-cyan-500 selection:text-black">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* Protected User Dashboard Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deposit"
                element={
                  <ProtectedRoute>
                    <DepositPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deposit-history"
                element={
                  <ProtectedRoute>
                    <DepositHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/withdraw"
                element={
                  <ProtectedRoute>
                    <WithdrawPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/withdrawal-history"
                element={
                  <ProtectedRoute>
                    <WithdrawalHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <ProtectedRoute>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-plans"
                element={
                  <ProtectedRoute>
                    <MyPlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <TransactionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team"
                element={
                  <ProtectedRoute>
                    <TeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verification"
                element={<Navigate to="/profile" replace />}
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <SupportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRoute>
                    <SupportPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Suite Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Desktop Footer */}
          <footer className="hidden md:block border-t border-slate-800/80 bg-slate-950/60 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" showText={true} />
              </div>

              <div className="flex items-center gap-6">
                <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                <Link to="/support" className="hover:text-slate-300 transition-colors">Support Desk</Link>
              </div>

              <p className="text-[10px] font-mono">
                © {new Date().getFullYear()} CEX Network Financial Group. All Rights Reserved.
              </p>
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>
      </Router>
    </AuthProvider>
  );
}
