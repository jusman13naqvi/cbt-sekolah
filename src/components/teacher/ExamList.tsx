import React, { useState } from 'react';
import { Plus, Edit, Trash2, Copy, Eye, Layers, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';

interface ExamListProps {
  exams: any[];
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (exam: any) => void;
  onOpenQuestions: (exam: any) => void;
  onOpenMonitoring: (exam: any) => void;
}

export const ExamList: React.FC<ExamListProps> = ({
  exams,
  onRefresh,
  onOpenCreate,
  onOpenEdit,
  onOpenQuestions,
  onOpenMonitoring,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteExam(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateExam(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300">BERLANGSUNG</span>;
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">TERJADWAL</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">SELESAI</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800">DRAFT</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Daftar Ujian CBT PJJ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Buat jadwal ujian, buat & kelola soal (5 tipe), atur token, dan pantau pengerjaan siswa secara langsung.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Ujian CBT Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            Belum ada ujian CBT dibuat. Klik tombol "Buat Ujian CBT Baru" di atas.
          </div>
        ) : (
          exams.map((ex) => (
            <div
              key={ex.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-cyan-500/50 transition space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(ex.status)}
                  <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                    Token: {ex.token || 'BEBAS'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                  {ex.title}
                </h3>

                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Mata Pelajaran:</strong>{' '}
                    {ex.subjectName}
                  </p>
                  <p>
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Kelas Target:</strong>{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{ex.className}</span>
                  </p>
                  <p>
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Durasi:</strong>{' '}
                    {ex.durationMinutes} Menit | KKM: {ex.kkm}
                  </p>
                  <p>
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Jumlah Soal:</strong>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-100">{ex.totalQuestions} Soal</span>
                  </p>
                </div>
              </div>

              {/* Prominent Question Management Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenQuestions(ex)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>📝 Buat & Kelola Soal Ujian ({ex.totalQuestions} Soal)</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenMonitoring(ex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-500/30 hover:bg-blue-500/20 transition"
                  title="Monitoring Pengawasan"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pantau Ujian</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(ex.id)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Salin Ujian"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenEdit(ex)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 transition"
                    title="Edit Pengaturan Ujian"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(ex)}
                    className="p-1.5 rounded-lg border border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition"
                    title="Hapus Ujian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Ujian CBT"
        message={`Apakah Anda yakin ingin menghapus ujian "${deleteTarget?.title}"? Semua soal dan hasil pengerjaan siswa pada ujian ini akan terhapus.`}
      />
    </div>
  );
};
