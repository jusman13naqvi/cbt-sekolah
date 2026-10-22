import React, { useState } from 'react';
import { Save, Key, RefreshCw } from 'lucide-react';
import { Modal } from '../Modal';
import { api } from '../../services/api';

interface ExamEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  subjects: any[];
  classes: any[];
  examData?: any;
}

export const ExamEditorModal: React.FC<ExamEditorProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  subjects,
  classes,
  examData,
}) => {
  const [title, setTitle] = useState(examData?.title || 'Ulangan Harian 1 Informatika');
  const [subjectId, setSubjectId] = useState(examData?.subjectId || subjects[0]?.id || '');
  const [classId, setClassId] = useState(examData?.classId || classes[0]?.id || '');
  const [description, setDescription] = useState(examData?.description || '');

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 1000 * 60 * 10).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 1000 * 60 * 60 * 48).toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(examData?.startTime ? new Date(examData.startTime).toISOString().slice(0, 16) : defaultStart);
  const [endTime, setEndTime] = useState(examData?.endTime ? new Date(examData.endTime).toISOString().slice(0, 16) : defaultEnd);
  const [durationMinutes, setDurationMinutes] = useState(examData?.durationMinutes || 60);
  const [kkm, setKkm] = useState(examData?.kkm || 75);
  const [token, setToken] = useState(examData?.token || 'SPANJU7');
  const [isTokenRequired, setIsTokenRequired] = useState(examData?.isTokenRequired ?? true);
  const [shuffleQuestions, setShuffleQuestions] = useState(examData?.shuffleQuestions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState(examData?.shuffleOptions ?? false);
  const [violationLimit, setViolationLimit] = useState(examData?.violationLimit || 3);
  const [violationAction, setViolationAction] = useState(examData?.violationAction || 'warn');
  const [autoReleaseScore, setAutoReleaseScore] = useState(examData?.autoReleaseScore ?? true);
  const [status, setStatus] = useState(examData?.status || 'ongoing');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const selectedSubject = subjects.find((s) => s.id === subjectId);
      const selectedClass = classes.find((c) => c.id === classId);

      const payload = {
        title,
        subjectId,
        subjectName: selectedSubject?.name || 'Informatika',
        classId,
        className: selectedClass?.name || '7A',
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes: Number(durationMinutes),
        kkm: Number(kkm),
        token,
        isTokenRequired,
        shuffleQuestions,
        shuffleOptions,
        violationLimit: Number(violationLimit),
        violationAction,
        autoReleaseScore,
        status,
      };

      if (examData?.id) {
        await api.updateExam(examData.id, payload);
      } else {
        await api.createExam(payload);
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan ujian.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs transition-colors";
  const optionStyle = "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={examData ? 'Edit Pengaturan Ujian CBT' : 'Buat Ujian CBT Baru'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Judul Ujian CBT *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Ulangan Harian 1 Informatika Kelas 7A"
            className={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Mata Pelajaran *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={inputStyle}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className={optionStyle}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Kelas Peserta *
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={inputStyle}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id} className={optionStyle}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Waktu Mulai Ujian *
            </label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Batas Akhir Ujian *
            </label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Durasi (Menit) *
            </label>
            <input
              type="number"
              min={10}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              KKM Ujian *
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={kkm}
              onChange={(e) => setKkm(Number(e.target.value))}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Status Ujian *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputStyle} font-bold`}
            >
              <option value="draft" className={optionStyle}>Draft (Belum Rilis)</option>
              <option value="scheduled" className={optionStyle}>Terjadwal</option>
              <option value="ongoing" className={optionStyle}>Berlangsung</option>
              <option value="completed" className={optionStyle}>Selesai</option>
            </select>
          </div>
        </div>

        {/* Token Section */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-cyan-500" /> Token Keamanan Ujian
            </span>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTokenRequired}
                onChange={(e) => setIsTokenRequired(e.target.checked)}
              />
              <span>Wajibkan Token</span>
            </label>
          </div>

          {isTokenRequired && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="SPANJU7"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-extrabold text-center tracking-widest text-base uppercase text-cyan-600 dark:text-cyan-400"
              />
              <button
                type="button"
                onClick={generateRandomToken}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Acak Token
              </button>
            </div>
          )}
        </div>

        {/* Violation & Publication Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Batas Maksimal Pelanggaran *
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={violationLimit}
              onChange={(e) => setViolationLimit(Math.max(1, Number(e.target.value)))}
              placeholder="Contoh: 1, 2, 3, 5, 10..."
              className={inputStyle}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tentukan toleransi kejadian (1, 2, 3, dst) sebelum ujian dikunci/sistem memberi tindakan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Publikasi Nilai Siswa
            </label>
            <select
              value={autoReleaseScore ? '1' : '0'}
              onChange={(e) => setAutoReleaseScore(e.target.value === '1')}
              className={inputStyle}
            >
              <option value="1" className={optionStyle}>Langsung Dirilis ke Siswa</option>
              <option value="0" className={optionStyle}>Ditahan (Rilis Manual Guru)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Ujian</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
