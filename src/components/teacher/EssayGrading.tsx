import React, { useEffect, useState } from 'react';
import { PenTool, CheckCircle2, Save, ArrowLeft, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';

interface EssayGradingProps {
  exams: any[];
  onBack: () => void;
}

export const EssayGrading: React.FC<EssayGradingProps> = ({ exams, onBack }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeAnswerId, setActiveAnswerId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams]);

  // Form
  const [scoreInput, setScoreInput] = useState<number>(0);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadEssayData = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const res = await api.getEssayAnswers(selectedExamId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEssayData();
  }, [selectedExamId]);

  const handleSelectAnswer = (ans: any) => {
    setActiveAnswerId(ans.answerId);
    setScoreInput(ans.scoreObtained || 0);
    setTeacherNotes(ans.teacherNotes || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnswerId) return;
    setSaving(true);
    setSuccessMsg(null);

    try {
      await api.gradeEssayAnswer(activeAnswerId, {
        scoreObtained: Number(scoreInput),
        teacherNotes,
      });
      setSuccessMsg('Nilai esai berhasil disimpan!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadEssayData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan nilai esai.');
    } finally {
      setSaving(false);
    }
  };

  const selectedAnswerObj = data?.studentAnswers?.find((a: any) => a.answerId === activeAnswerId);
  const selectedQuestionObj = data?.essayQuestions?.find((q: any) => q.id === selectedAnswerObj?.questionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Penilaian Esai Manual
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Periksa lembar jawaban esai siswa, berikan skor poin, dan tambahkan catatan apresiasi/koreksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Pilih Ujian:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.className})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Student Answer Selector */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Daftar Lembar Esai Siswa ({data?.studentAnswers?.length || 0})
          </h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {!data || data.studentAnswers?.length === 0 ? (
              <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                Tidak ada lembar jawaban esai pada ujian ini.
              </div>
            ) : (
              data.studentAnswers.map((ans: any, idx: number) => {
                const isSelected = activeAnswerId === ans.answerId;
                return (
                  <div
                    key={ans.answerId}
                    onClick={() => handleSelectAnswer(ans)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{ans.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Kelas {ans.className} • NISN: {ans.studentNisn || '-'}
                      </p>
                    </div>

                    <div>
                      {ans.isGraded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Skor: {ans.scoreObtained}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          Belum Dinilai
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Answer Viewer & Grading Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {!selectedAnswerObj ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Pilih salah satu siswa di sebelah kiri untuk memeriksa lembar jawaban esai.
            </div>
          ) : (
            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Siswa:</span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {selectedAnswerObj.studentName} ({selectedAnswerObj.className})
                </h3>
              </div>

              {/* Question Text */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block mb-1">
                  Soal Pertanyaan Esai (Bobot Maks: {selectedQuestionObj?.weight || 20} poin):
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {selectedQuestionObj?.question_text}
                </p>
              </div>

              {/* Student Answer Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jawaban Teks Siswa:
                </label>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-sans leading-relaxed border border-slate-800 min-h-[120px]">
                  {selectedAnswerObj.answerText || '(Siswa tidak mengisikan jawaban esai)'}
                </div>
              </div>

              {/* Grade Input & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Skor Poin Diberikan (0 - {selectedQuestionObj?.weight || 20}) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={selectedQuestionObj?.weight || 100}
                    step={0.5}
                    required
                    value={scoreInput}
                    onChange={(e) => setScoreInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Umpan Balik Guru (Opsional)
                  </label>
                  <input
                    type="text"
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="Contoh: Jawaban sangat baik dan lengkap!"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Nilai Esai</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
