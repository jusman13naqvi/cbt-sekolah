import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, RotateCcw, Unlock, Search, Filter, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';

interface LiveMonitoringProps {
  exam?: any;
  allExams?: any[];
  onBack?: () => void;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ exam: initialExam, allExams = [], onBack }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExam?.id || allExams[0]?.id || '');
  const [currentExam, setCurrentExam] = useState<any>(initialExam || allExams[0] || null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'submitted' | 'graded' | 'locked' | 'not_started'>('all');

  // Confirmations
  const [resetExamTarget, setResetExamTarget] = useState<any>(null);
  const [resetViolationTarget, setResetViolationTarget] = useState<any>(null);

  useEffect(() => {
    if (selectedExamId) {
      const found = allExams.find((e) => e.id === selectedExamId) || currentExam;
      setCurrentExam(found);
    }
  }, [selectedExamId, allExams]);

  const loadParticipants = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const data = await api.getExamParticipants(selectedExamId);
      setParticipants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
    const interval = setInterval(loadParticipants, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, [selectedExamId]);

  const handleConfirmResetExam = async () => {
    if (!resetExamTarget) return;
    try {
      await api.resetParticipantExam(resetExamTarget.id);
      setResetExamTarget(null);
      loadParticipants();
    } catch (err: any) {
      alert(err.message || 'Gagal mereset ujian siswa.');
    }
  };

  const handleConfirmResetViolations = async () => {
    if (!resetViolationTarget) return;
    try {
      await api.resetParticipantViolations(resetViolationTarget.id);
      setResetViolationTarget(null);
      loadParticipants();
    } catch (err: any) {
      alert(err.message || 'Gagal mereset pelanggaran.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 animate-pulse">SEDANG MENGERJAKAN</span>;
      case 'submitted':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">MENUNGGU ESAI</span>;
      case 'graded':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">SELESAI & DINILAI</span>;
      case 'locked':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">TERKUNCI (PELANGGARAN)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800">BELUM MULAI</span>;
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (p.studentNisn && p.studentNisn.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'submitted') return matchesSearch && ['submitted', 'graded'].includes(p.status);
    return matchesSearch && p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline mb-1">
              ← Kembali ke Daftar Ujian
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Monitoring & Pengawasan Ujian CBT Real-Time
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau siapa yang sedang login, pengerjaan aktif, deteksi pelanggaran, serta reset sesi untuk remedial/buka kunci.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Exam Selector */}
          {allExams.length > 0 && (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              {allExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.className})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadParticipants}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {currentExam && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-800 dark:text-cyan-300">
          <div>
            <strong>Judul Ujian:</strong> {currentExam.title} | <strong>Mapel:</strong> {currentExam.subjectName} | <strong>Kelas:</strong> {currentExam.className}
          </div>
          <div>
            <strong>Token Ujian:</strong> <span className="font-mono bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-500/30 font-bold">{currentExam.token || 'BEBAS'}</span> | <strong>Batas Pelanggaran:</strong> {currentExam.violationLimit || 3}x
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Total Peserta Dipantau</span>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{participants.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Sedang Mengerjakan</span>
          <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
            {participants.filter((p) => p.status === 'in_progress').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Selesai Mengumpulkan</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {participants.filter((p) => ['submitted', 'graded'].includes(p.status)).length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Terdeteksi Pelanggaran</span>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {participants.filter((p) => p.violationCount > 0).length}
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa atau NISN..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              statusFilter === 'all'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              statusFilter === 'in_progress'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Sedang Ujian
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              statusFilter === 'submitted'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              statusFilter === 'locked'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Terkunci
          </button>
        </div>
      </div>

      {/* Participants Live Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase">
              <tr>
                <th className="p-4">No</th>
                <th className="p-4">Nama Siswa</th>
                <th className="p-4">NISN</th>
                <th className="p-4">Status Ujian</th>
                <th className="p-4">Catatan Pelanggaran</th>
                <th className="p-4">Nilai CBT</th>
                <th className="p-4 text-right">Aksi Reset & Buka Kunci</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p, idx) => {
                  const formattedScore =
                    ['submitted', 'graded'].includes(p.status) && p.score !== null && p.score !== undefined
                      ? Number(p.score).toFixed(2).replace(/\.00$/, '')
                      : '-';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{p.studentName}</td>
                      <td className="p-4 font-mono">{p.studentNisn || '-'}</td>
                      <td className="p-4">{getStatusBadge(p.status)}</td>
                      <td className="p-4 font-semibold">
                        {p.violationCount > 0 ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {p.violationCount} kali (Batas: {currentExam?.violationLimit || 3})
                          </span>
                        ) : (
                          <span className="text-slate-400">Nihil</span>
                        )}
                      </td>
                      <td className="p-4 font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        {formattedScore}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {p.violationCount > 0 && (
                          <button
                            onClick={() => setResetViolationTarget(p)}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition inline-flex items-center gap-1"
                            title="Bersihkan Pelanggaran & Buka Kunci Ujian"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Reset Pelanggaran</span>
                          </button>
                        )}

                        {p.status !== 'not_started' && (
                          <button
                            onClick={() => setResetExamTarget(p)}
                            className="px-2.5 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold transition inline-flex items-center gap-1"
                            title="Reset Ujian untuk Remidial"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Ujian (Remidial)</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(resetExamTarget)}
        onClose={() => setResetExamTarget(null)}
        onConfirm={handleConfirmResetExam}
        title="Reset Ujian Siswa (Remidial)"
        message={`Apakah Anda yakin ingin mereset sesi ujian siswa "${resetExamTarget?.studentName}"? Semua jawaban sebelumnya akan dibersihkan agar siswa dapat mengerjakan ulang/remidial.`}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={Boolean(resetViolationTarget)}
        onClose={() => setResetViolationTarget(null)}
        onConfirm={handleConfirmResetViolations}
        title="Reset Catatan Pelanggaran"
        message={`Apakah Anda yakin ingin mereset catatan pelanggaran siswa "${resetViolationTarget?.studentName}" dan membuka kembali kunci pengerjaannya?`}
        isDangerous={false}
      />
    </div>
  );
};
