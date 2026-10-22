import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, HelpCircle, Save, ArrowLeft } from 'lucide-react';
import { QuestionType } from '../../types';
import { api } from '../../services/api';

interface QuestionBankEditorProps {
  exam: any;
  onBack: () => void;
  onQuestionsUpdated: () => void;
}

export const QuestionBankEditor: React.FC<QuestionBankEditorProps> = ({
  exam,
  onBack,
  onQuestionsUpdated,
}) => {
  const [questions, setQuestions] = useState<any[]>(exam.questions || []);
  const [activeQId, setActiveQId] = useState<string | null>(null);

  // Question Form State
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [weight, setWeight] = useState(20);

  // Options for PG, Complex, True/False
  const [options, setOptions] = useState<Array<{ id?: string; optionText: string; isCorrect: boolean; imageUrl?: string }>>([
    { optionText: 'Opsi A', isCorrect: true },
    { optionText: 'Opsi B', isCorrect: false },
    { optionText: 'Opsi C', isCorrect: false },
    { optionText: 'Opsi D', isCorrect: false },
  ]);

  // Pairs for Matching
  const [matchingPairs, setMatchingPairs] = useState<Array<{ id?: string; leftText: string; rightText: string }>>([
    { leftText: 'Pernyataan 1', rightText: 'Pasangan 1' },
    { leftText: 'Pernyataan 2', rightText: 'Pasangan 2' },
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetQuestionForm = () => {
    setActiveQId(null);
    setQuestionType('multiple_choice');
    setQuestionText('');
    setImageUrl('');
    setWeight(20);
    setOptions([
      { optionText: 'Opsi A', isCorrect: true },
      { optionText: 'Opsi B', isCorrect: false },
      { optionText: 'Opsi C', isCorrect: false },
      { optionText: 'Opsi D', isCorrect: false },
    ]);
    setMatchingPairs([
      { leftText: 'Pernyataan 1', rightText: 'Pasangan 1' },
      { leftText: 'Pernyataan 2', rightText: 'Pasangan 2' },
    ]);
    setErrorMsg(null);
  };

  const handleEditQuestion = (q: any) => {
    setActiveQId(q.id);
    setQuestionType(q.questionType);
    setQuestionText(q.questionText);
    setImageUrl(q.imageUrl || '');
    setWeight(q.weight || 20);

    if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(q.questionType)) {
      setOptions(
        q.options && q.options.length > 0
          ? q.options.map((o: any) => ({
              id: o.id,
              optionText: o.optionText,
              isCorrect: Boolean(o.isCorrect),
              imageUrl: o.imageUrl || '',
            }))
          : [
              { optionText: 'Opsi A', isCorrect: true },
              { optionText: 'Opsi B', isCorrect: false },
            ]
      );
    } else if (q.questionType === 'matching') {
      setMatchingPairs(
        q.matchingPairs && q.matchingPairs.length > 0
          ? q.matchingPairs.map((p: any) => ({
              id: p.id,
              leftText: p.leftText,
              rightText: p.rightText,
            }))
          : [{ leftText: '', rightText: '' }]
      );
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setErrorMsg('Teks pertanyaan wajib diisi.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        questionType,
        questionText,
        imageUrl,
        weight: Number(weight),
        options,
        matchingPairs,
      };

      if (activeQId) {
        await api.updateQuestion(activeQId, payload);
      } else {
        await api.addQuestion(exam.id, payload);
      }

      resetQuestionForm();
      onQuestionsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan soal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;
    try {
      await api.deleteQuestion(qId);
      onQuestionsUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper Option Handlers
  const addOptionRow = () => {
    setOptions([...options, { optionText: `Opsi ${String.fromCharCode(65 + options.length)}`, isCorrect: false }]);
  };

  const removeOptionRow = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const toggleOptionCorrect = (index: number) => {
    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      // Single correct option
      setOptions(
        options.map((opt, i) => ({
          ...opt,
          isCorrect: i === index,
        }))
      );
    } else if (questionType === 'complex_multiple_choice') {
      // Multi select correct options
      setOptions(
        options.map((opt, i) => (i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt))
      );
    }
  };

  // Helper Matching Pair Handlers
  const addMatchingRow = () => {
    setMatchingPairs([...matchingPairs, { leftText: '', rightText: '' }]);
  };

  const removeMatchingRow = (index: number) => {
    if (matchingPairs.length <= 1) return;
    setMatchingPairs(matchingPairs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Ujian</span>
        </button>
        <span className="text-xs font-bold text-slate-500">
          Ujian: {exam.title} ({questions.length} Soal)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Questions List Palette */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Daftar Bank Soal ({questions.length})
            </h3>
            <button
              onClick={resetQuestionForm}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Soal Baru</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                Belum ada soal pada ujian ini. Silakan buat soal pertama di panel kanan.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => handleEditQuestion(q)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    activeQId === q.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 max-w-[80%]">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold block truncate">{q.questionText}</span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {q.questionType.replace('_', ' ')} • Bobot: {q.weight}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(q.id);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Question Editor Form (Supports 5 Question Types) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            {activeQId ? 'Edit Soal' : 'Buat Soal Baru'}
          </h3>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Soal CBT *
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="multiple_choice">1. Pilihan Ganda (Satu Jawaban)</option>
                  <option value="complex_multiple_choice">2. Pilihan Ganda Kompleks (Berapa Jawaban Benar)</option>
                  <option value="true_false">3. Benar / Salah</option>
                  <option value="matching">4. Menjodohkan (Pasangan)</option>
                  <option value="essay">5. Esai / Uraian (Penilaian Manual)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bobot Nilai Soal *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teks Pertanyaan Soal *
              </label>
              <textarea
                rows={3}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Tuliskan isi soal pertanyaan di sini..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                URL Gambar Soal (Opsional)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Editor Sections based on Question Type */}
            {['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(questionType) && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Opsi Jawaban & Kunci
                  </span>
                  {questionType !== 'true_false' && (
                    <button
                      type="button"
                      onClick={addOptionRow}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Opsi
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOptionCorrect(idx)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          opt.isCorrect
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{opt.isCorrect ? 'KUNCI' : 'SALAH'}</span>
                      </button>

                      <input
                        type="text"
                        required
                        value={opt.optionText}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx].optionText = e.target.value;
                          setOptions(updated);
                        }}
                        placeholder={`Teks opsi ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                      />

                      {options.length > 2 && questionType !== 'true_false' && (
                        <button
                          type="button"
                          onClick={() => removeOptionRow(idx)}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionType === 'matching' && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Pasangan Menjodohkan
                  </span>
                  <button
                    type="button"
                    onClick={addMatchingRow}
                    className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pasangan
                  </button>
                </div>

                <div className="space-y-2">
                  {matchingPairs.map((pair, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={pair.leftText}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].leftText = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        placeholder={`Pernyataan Kolom A #${idx + 1}`}
                        className="col-span-5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                      <span className="col-span-1 text-center font-bold text-slate-400">↔</span>
                      <input
                        type="text"
                        required
                        value={pair.rightText}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].rightText = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        placeholder={`Pasangan Kolom B #${idx + 1}`}
                        className="col-span-5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeMatchingRow(idx)}
                        className="col-span-1 p-2 text-slate-400 hover:text-red-500 text-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionType === 'essay' && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300">
                Catatan Soal Esai: Jawaban siswa akan berupa teksuraian panjang. Penilaian dilakukan secara manual oleh Guru pada menu <strong>Penilaian Esai Manual</strong>.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={resetQuestionForm}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{activeQId ? 'Simpan Perubahan Soal' : 'Tambahkan Soal ke Bank'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
