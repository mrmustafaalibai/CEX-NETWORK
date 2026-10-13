import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Shield,
  User,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  Wallet,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate } from '../lib/utils';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationItem } from '../types';
import { markNotificationAsRead } from '../services/userService';
import { BrandLogo } from './BrandLogo';

export const Navbar: React.FC = () => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [currentUser.uid, 'all']),
      limit(15)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as NotificationItem);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(items);
      },
      (err) => {
        console.warn('Notifications listener notice:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Deposit', path: '/deposit' },
    { label: 'Withdraw', path: '/withdraw' },
    { label: 'Plans', path: '/plans' },
    { label: 'My Plans', path: '/my-plans' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Team', path: '/team' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#06090e]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Official Brand Logo - Only Logo in upper left side, no text */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center group py-1">
              <BrandLogo size="md" showText={false} imgClassName="h-9 w-auto object-contain" />
            </Link>

            {/* Desktop Navigation Links */}
            {currentUser && (
              <nav className="hidden lg:flex items-center gap-1 ml-6">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-white/10 text-cyan-400 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                {/* Available Balance Chip */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Balance</span>
                    <span className="text-xs font-bold text-white font-mono">
                      {formatPKR(userProfile?.balancePkr)}
                    </span>
                  </div>
                </div>

                {/* Admin Access Chip */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Admin Suite</span>
                    <span className="sm:hidden">Admin</span>
                  </Link>
                )}

                {/* Notifications Bell (Touch target min-h-[44px]) */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="relative min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all flex items-center justify-center"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-400 text-[10px] font-bold text-black flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Popover */}
                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0b111c] border border-white/10 shadow-2xl z-50 overflow-hidden">
                      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{unreadCount} Unread</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (!n.isRead) markNotificationAsRead(n.id);
                              }}
                              className={`p-3 text-xs transition-colors cursor-pointer hover:bg-white/5 ${
                                n.isRead ? 'text-slate-400' : 'bg-cyan-950/20 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-white">{n.title}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{formatDate(n.createdAt)}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-slate-300">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu Trigger (Touch target min-h-[44px]) */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 min-h-[44px] p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-bold text-white text-xs shadow">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="hidden md:flex flex-col">
                      <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                        {userProfile?.displayName || 'User'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono truncate max-w-[100px]">
                        {userProfile?.referralCode || 'PRO'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {/* Profile Dropdown */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0b111c] border border-white/10 shadow-2xl z-50 p-2">
                      <div className="p-3 border-b border-white/10 mb-1">
                        <p className="text-xs font-bold text-white truncate">{userProfile?.displayName}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-cyan-400 font-mono">
                            Referral: {userProfile?.referralCode}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-xs">
                        <Link
                          to="/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User className="w-4 h-4 text-cyan-400" />
                          <span>My Profile & Settings</span>
                        </Link>

                        <Link
                          to="/support"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <LifeBuoy className="w-4 h-4 text-blue-400" />
                          <span>Help & Support</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/20 transition-colors"
                          >
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span>Admin Suite</span>
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Drawer Toggle (Touch target min-h-[44px]) */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-md transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && currentUser && (
          <div className="lg:hidden py-3 border-t border-white/10 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  location.pathname === link.path
                    ? 'bg-white/10 text-cyan-400'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-950/30 border border-amber-800/40"
              >
                Admin Suite
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
