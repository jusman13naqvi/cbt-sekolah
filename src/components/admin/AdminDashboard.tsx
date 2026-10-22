import React, { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, FileCheck2, Award, Database, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, hData] = await Promise.all([
        api.getAdminStats(),
        api.getDbHealth(),
      ]);
      setStats(sData);
      setDbHealth(hData);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-slate-500">Memuat dashboard admin...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Guru', value: stats?.teacherCount || 0, icon: UserCheck, color: 'from-blue-500 to-indigo-600' },
    { title: 'Total Siswa', value: stats?.studentCount || 0, icon: Users, color: 'from-cyan-500 to-blue-500' },
    { title: 'Kelas Aktif', value: stats?.classCount || 0, icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
    { title: 'Total Ujian CBT', value: stats?.examCount || 0, icon: FileCheck2, color: 'from-purple-500 to-indigo-600' },
    { title: 'Hasil Terkumpul', value: stats?.resultCount || 0, icon: Award, color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Panel Administrator CBT SPANJU
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            SMP Negeri 7 Muara Badak
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Kelola data guru, siswa, kelas, konfigurasi ujian CBT, backup database Turso, dan pantau log aktivitas sistem PJJ.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-base">
            <Activity className="w-5 h-5 text-cyan-500" />
            <span>Status Kesehatan Sistem & Database</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">Mode Database</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-500" />
              {stats?.dbMode || 'Local SQLite'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">Status Koneksi</span>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {dbHealth?.status || 'Terhubung'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">Latency Database</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
              {dbHealth?.latencyMs ? `${dbHealth.latencyMs} ms` : '< 5 ms'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
