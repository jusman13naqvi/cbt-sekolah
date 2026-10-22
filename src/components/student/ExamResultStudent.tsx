import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, XCircle, Clock, Lock, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const ExamResultStudent: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentResults();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
        <span>Memuat hasil ujian...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Hasil Ujian & Rekap Nilai Saya
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Lihat riwayat nilai ulangan harian CBT yang telah dirilis oleh Guru Pengampu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            Belum ada hasil ujian yang dapat ditampilkan.
          </div>
        ) : (
          results.map((r) => {
            const isReleased = r.autoReleaseScore;
            const isPassed = r.isPassed;
            const hasEssayPending = r.totalEssayCount > 0 && r.essayGradedCount < r.totalEssayCount;

            return (
              <div
                key={r.participantId}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    {r.subjectName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    KKM: {r.kkm}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {r.examTitle}
                </h3>

                <p className="text-xs text-slate-500">
                  Guru: {r.teacherName} • Dikumpulkan: {new Date(r.submitTime).toLocaleDateString('id-ID')}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {!isReleased ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                      <Lock className="w-4 h-4" />
                      <span>Nilai Belum Dirilis Guru</span>
                    </div>
                  ) : hasEssayPending ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                      <Clock className="w-4 h-4" />
                      <span>Menunggu Penilaian Esai Guru</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                        {r.score}
                      </span>
                      {isPassed ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> TUNTAS
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> TIDAK TUNTAS
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
