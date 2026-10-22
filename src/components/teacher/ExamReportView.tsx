import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, CheckCircle2, Lock, Eye, RefreshCw, RotateCcw, Unlock } from 'lucide-react';
import { api } from '../../services/api';
import { exportExamResultsToExcel } from '../../services/excel';
import { exportExamResultsToPDF } from '../../services/pdf';
import { ConfirmDialog } from '../ConfirmDialog';

interface ExamReportViewProps {
  exams: any[];
}

export const ExamReportView: React.FC<ExamReportViewProps> = ({ exams }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [participants, setParticipants] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Confirmations
  const [resetExamTarget, setResetExamTarget] = useState<any>(null);
  const [resetViolationTarget, setResetViolationTarget] = useState<any>(null);

  // Sync selectedExamId when exams list updates
  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams]);

  const currentExam = exams.find((e) => e.id === selectedExamId);

  const loadReportData = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        api.getExamParticipants(selectedExamId),
        api.getSettings(),
      ]);
      setParticipants(pData);
      setSchoolSettings(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedExamId]);

  const handleToggleRelease = async () => {
    if (!currentExam) return;
    const nextState = !currentExam.autoReleaseScore;
    try {
      await api.releaseScores(currentExam.id, nextState);
      currentExam.autoReleaseScore = nextState;
      loadReportData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmResetExam = async () => {
    if (!resetExamTarget) return;
    try {
      await api.resetParticipantExam(resetExamTarget.id);
      setResetExamTarget(null);
      loadReportData();
    } catch (err: any) {
      alert(err.message || 'Gagal mereset ujian siswa.');
    }
  };

  const handleConfirmResetViolations = async () => {
    if (!resetViolationTarget) return;
    try {
      await api.resetParticipantViolations(resetViolationTarget.id);
      setResetViolationTarget(null);
      loadReportData();
    } catch (err: any) {
      alert(err.message || 'Gagal mereset pelanggaran.');
    }
  };

  const handleExportExcel = () => {
    if (!currentExam) return;
    exportExamResultsToExcel(currentExam, participants, schoolSettings?.schoolName || 'SMP Negeri 7 Muara Badak');
  };

  const handleExportPDF = () => {
    if (!currentExam) return;
    exportExamResultsToPDF(currentExam, participants, {
      name: schoolSettings?.schoolName || 'SMP Negeri 7 Muara Badak',
      npsn: schoolSettings?.npsn || '30401234',
      address: schoolSettings?.address || 'Jl. Pendidikan No. 07, Muara Badak, Kutai Kartanegara',
      isKsrg: schoolSettings?.isKsrg ?? true,
    });
  };

  // Stats calculation
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  participants.forEach((p) => {
    if (['graded', 'submitted'].includes(p.status)) {
      if (p.totalEssayCount > 0 && p.essayGradedCount < p.totalEssayCount) {
        pendingCount++;
      } else if (p.score >= (currentExam?.kkm || 75)) {
        passedCount++;
      } else {
        failedCount++;
      }
    } else {
      pendingCount++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Laporan Hasil Ujian & Ekspor Nilai
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unduh laporan nilai resmi dalam format Excel (XLSX) dan PDF lengkap dengan Kop SMP Negeri 7 Muara Badak.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pilih Ujian:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                {ex.title} ({ex.className})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions & Release Toggle */}
      {currentExam && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Publikasi Nilai Siswa:</span>
            <button
              onClick={handleToggleRelease}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                currentExam.autoReleaseScore
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentExam.autoReleaseScore ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>NILAI DIRILIS KE SISWA</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>NILAI DITAHAN (RILIS MANUAL)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel XLSX</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md transition"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh PDF Resmi</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Total Peserta</span>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{participants.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Tuntas (&gt;= KKM {currentExam?.kkm || 75})</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{passedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Belum Tuntas (&lt; KKM)</span>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{failedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">Menunggu Penilaian Esai</span>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase">
              <tr>
                <th className="p-4">No</th>
                <th className="p-4">Nama Siswa</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">NISN</th>
                <th className="p-4">Nilai Ujian</th>
                <th className="p-4">Data Pelanggaran</th>
                <th className="p-4">Nilai Akhir</th>
                <th className="p-4">Ketuntasan</th>
                <th className="p-4 text-right">Aksi Remidial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Belum ada hasil peserta terdaftar pada ujian ini.
                  </td>
                </tr>
              ) : (
                participants.map((p, idx) => {
                  const isPassed = p.score >= (currentExam?.kkm || 75);
                  let ket = isPassed ? 'Tuntas' : 'Tidak Tuntas';
                  if (p.totalEssayCount > 0 && p.essayGradedCount < p.totalEssayCount) {
                    ket = 'Menunggu Penilaian Esai';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{p.studentName}</td>
                      <td className="p-4">{p.className}</td>
                      <td className="p-4 font-mono">{p.studentNisn || '-'}</td>
                      <td className="p-4 font-semibold">{p.score ?? 0}</td>
                      <td className="p-4">
                        {p.violationCount > 0 ? `${p.violationCount} kali catatan` : 'Tidak Ada'}
                      </td>
                      <td className="p-4 font-extrabold text-sm text-cyan-600 dark:text-cyan-400">{p.score ?? 0}</td>
                      <td className="p-4">
                        {ket === 'Tuntas' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            TUNTAS
                          </span>
                        ) : ket === 'Tidak Tuntas' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                            TIDAK TUNTAS
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            MENUNGGU ESAI
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {p.violationCount > 0 && (
                          <button
                            onClick={() => setResetViolationTarget(p)}
                            className="p-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold transition hover:bg-amber-100"
                            title="Reset Catatan Pelanggaran"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {p.status !== 'not_started' && (
                          <button
                            onClick={() => setResetExamTarget(p)}
                            className="p-1.5 rounded-lg border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold transition hover:bg-cyan-100"
                            title="Reset Ujian untuk Remidial Siswa"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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
        message={`Apakah Anda yakin ingin mereset ujian siswa "${resetExamTarget?.studentName}"? Siswa dapat mengerjakan ulang ujian ini.`}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={Boolean(resetViolationTarget)}
        onClose={() => setResetViolationTarget(null)}
        onConfirm={handleConfirmResetViolations}
        title="Reset Catatan Pelanggaran"
        message={`Apakah Anda yakin ingin mereset catatan pelanggaran siswa "${resetViolationTarget?.studentName}"?`}
        isDangerous={false}
      />
    </div>
  );
};
