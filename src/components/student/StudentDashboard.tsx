import React, { useEffect, useState } from 'react';
import { Play, Key, Clock, Award, ShieldAlert, CheckCircle2, RefreshCw, FileCheck2 } from 'lucide-react';
import { api } from '../../services/api';
import { CBTExamInterface } from './CBTExamInterface';
import { ExamResultStudent } from './ExamResultStudent';
import { Modal } from '../Modal';

interface StudentDashboardProps {
  user: any;
  activeTab: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab }) => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CBT Exam Execution State
  const [activeCbt, setActiveCbt] = useState<any>(null); // { examId, examTitle, subjectName, sessionData }
  const [tokenInput, setTokenInput] = useState('');
  const [selectedExamForToken, setSelectedExamForToken] = useState<any>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const loadStudentExams = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentExams();
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentExams();
  }, []);

  const handleStartExamClick = (exam: any) => {
    setTokenInput('');
    setStartError(null);
    if (exam.isTokenRequired) {
      setSelectedExamForToken(exam);
    } else {
      executeStartExam(exam, '');
    }
  };

  const executeStartExam = async (exam: any, token: string) => {
    setStarting(true);
    setStartError(null);
    try {
      const sessionData = await api.startExam(exam.id, token);
      setActiveCbt({
        examId: exam.id,
        examTitle: exam.title,
        subjectName: exam.subjectName,
        sessionData,
      });
      setSelectedExamForToken(null);
    } catch (err: any) {
      setStartError(err.message || 'Gagal memulai ujian.');
    } finally {
      setStarting(false);
    }
  };

  if (activeCbt) {
    return (
      <CBTExamInterface
        examId={activeCbt.examId}
        examTitle={activeCbt.examTitle}
        subjectName={activeCbt.subjectName}
        studentName={user.fullName}
        className={user.className || '7A'}
        sessionData={activeCbt.sessionData}
        onFinish={() => {
          setActiveCbt(null);
          loadStudentExams();
        }}
      />
    );
  }

  if (activeTab === 'results') {
    return <ExamResultStudent />;
  }

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            AKUN SISWA CBT
          </span>
          <h2 className="text-xl font-bold mt-1">{user.fullName}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelas {user.className || '7A'} • NISN: {user.nisn || '-'} • SMP Negeri 7 Muara Badak
          </p>
        </div>

        <button
          onClick={loadStudentExams}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Available Exams Section */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">
          Daftar Ulangan Harian & Ujian CBT
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat jadwal ujian...
          </div>
        ) : exams.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            Belum ada ujian CBT tersedia untuk kelas Anda saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex) => {
              const isCompleted = ['submitted', 'graded'].includes(ex.myStatus);
              const isOngoing = ex.myStatus === 'in_progress';

              return (
                <div
                  key={ex.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-cyan-500/50 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        {ex.subjectName}
                      </span>
                      <span className="text-xs text-slate-400">
                        Durasi: {ex.durationMinutes} Menit
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {ex.title}
                    </h4>

                    <p className="text-xs text-slate-500 mt-1">
                      Guru: {ex.teacherName} • KKM: {ex.kkm}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {isCompleted ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ujian Selesai Dikumpulkan
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStartExamClick(ex)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isOngoing ? 'Lanjutkan Pengerjaan Ujian' : 'Mulai Kerjakan Ujian'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Token Verification Modal */}
      {selectedExamForToken && (
        <Modal
          isOpen={Boolean(selectedExamForToken)}
          onClose={() => setSelectedExamForToken(null)}
          title="Masukkan Token Ujian CBT"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ujian "{selectedExamForToken.title}" mewajibkan token resmi pengawas CBT.
            </p>

            {startError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {startError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Token Ujian (6 Karakter) *
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="Contoh: SPANJU7"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono font-bold tracking-widest text-base uppercase text-cyan-600 dark:text-cyan-400"
              />
            </div>

            <button
              onClick={() => executeStartExam(selectedExamForToken, tokenInput)}
              disabled={starting || !tokenInput.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {starting ? 'Memulai Ujian...' : 'Konfirmasi & Masuk Ujian'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
