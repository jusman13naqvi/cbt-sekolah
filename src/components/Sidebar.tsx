import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  FileCheck2,
  FileSpreadsheet,
  Settings,
  History,
  Database,
  Award,
  PenTool,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab }) => {
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'teachers', label: 'Kelola Data Guru', icon: UserCheck },
    { id: 'students', label: 'Kelola Data Siswa', icon: Users },
    { id: 'classes', label: 'Data Kelas (7A-9B)', icon: BookOpen },
    { id: 'settings', label: 'Profil Sekolah & KSRG', icon: Settings },
    { id: 'audit', label: 'Log Aktivitas Sistem', icon: History },
    { id: 'backup', label: 'Backup & Pemulihan', icon: Database },
  ];

  const teacherMenuItems = [
    { id: 'exams', label: 'Kelola Ujian CBT', icon: FileCheck2 },
    { id: 'monitoring', label: 'Monitoring Ujian Real-Time', icon: Activity },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'essay-grading', label: 'Penilaian Esai Manual', icon: PenTool },
    { id: 'reports', label: 'Laporan & Ekspor Nilai', icon: FileSpreadsheet },
  ];

  const studentMenuItems = [
    { id: 'dashboard', label: 'Ujian CBT Saya', icon: LayoutDashboard },
    { id: 'results', label: 'Hasil Ujian & Nilai', icon: Award },
  ];

  const items = role === 'admin' ? adminMenuItems : role === 'teacher' ? teacherMenuItems : studentMenuItems;

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 transition-colors">
      <div>
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          Menu Utama ({role.toUpperCase()})
        </div>
        <nav className="mt-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-600 dark:text-cyan-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>SPANJU CBT v1.0</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          SMP Negeri 7 Muara Badak — Kandidat Sekolah Rujukan Google
        </p>
      </div>
    </aside>
  );
};
