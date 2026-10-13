import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, Briefcase, Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  const navItems = [
    { label: 'Plans', path: '/plans', icon: Layers },
    { label: 'My Plans', path: '/my-plans', icon: Briefcase },
    { label: 'Home', path: '/', icon: Home, isCenter: true },
    { label: 'Team', path: '/team', icon: Users },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#06090e]/95 backdrop-blur-xl border-t border-white/10 px-3 pt-1.5 pb-safe shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center -mt-6 group min-w-[54px] min-h-[54px] justify-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-cyan-400 text-black shadow-cyan-400/30'
                      : 'bg-[#0f172a] border border-white/15 text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-tight ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[48px] min-h-[48px] rounded-xl transition-all active:scale-95 ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-cyan-400' : 'stroke-[1.8]'}`} />
              <span
                className={`text-[10px] mt-1 font-medium tracking-tight ${
                  isActive ? 'font-bold text-cyan-400' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
