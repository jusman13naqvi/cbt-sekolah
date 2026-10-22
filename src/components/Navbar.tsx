import React, { useState, useEffect } from 'react';
import { LogOut, ShieldCheck, Clock, User as UserIcon, Moon, Sun } from 'lucide-react';
import { User, SchoolSettings } from '../types';

interface NavbarProps {
  user: User;
  schoolSettings: SchoolSettings | null;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, schoolSettings, onLogout, darkMode, setDarkMode }) => {
  const [serverTime, setServerTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setServerTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'ADMINISTRATOR', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' };
      case 'teacher':
        return { label: 'GURU PENGAMPUS', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300' };
      default:
        return { label: `SISWA (${user.className || '7A'})`, bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' };
    }
  };

  const roleInfo = getRoleLabel(user.role);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: School Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-lg text-white shadow-md shadow-cyan-500/20">
            {schoolSettings?.logoUrl ? (
              <img src={schoolSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              '7'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-cyan-600 dark:text-cyan-400">PJJ SPANJU</span>
              {schoolSettings?.isKsrg && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  KSRG Google
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-none">
              {schoolSettings?.schoolName || 'SMP Negeri 7 Muara Badak'}
            </p>
          </div>
        </div>

        {/* Center: Server Time Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono">
          <Clock className="w-4 h-4 text-cyan-500 animate-pulse" />
          <span>{serverTime || '00:00:00 WITA'}</span>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title={darkMode ? 'Mode Terang (Light Mode)' : 'Mode Gelap (Dark Mode)'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Badge */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${roleInfo.bg}`}>
              {roleInfo.label}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium border border-red-500/30 transition"
            title="Keluar / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
