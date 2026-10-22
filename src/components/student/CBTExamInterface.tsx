import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  ShieldAlert,
  Maximize2,
  Grid,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../Modal';

interface CBTExamInterfaceProps {
  examId: string;
  examTitle: string;
  subjectName: string;
  studentName: string;
  className: string;
  sessionData: any; // { participantId, durationMinutes, violationLimit, questions, savedAnswers, serverTime }
  onFinish: () => void;
}

export const CBTExamInterface: React.FC<CBTExamInterfaceProps> = ({
  examId,
  examTitle,
  subjectName,
  studentName,
  className,
  sessionData,
  onFinish,
}) => {
  const [questions] = useState<any[]>(sessionData.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answerJson: any; isDoubtful: boolean }>>(
    sessionData.savedAnswers || {}
  );
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  // Auto-save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));

  // Timer State (Server-backed countdown)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const startMs = new Date(sessionData.startTime).getTime();
    const durationMs = sessionData.durationMinutes * 60 * 1000;
    const nowMs = new Date(sessionData.serverTime).getTime();
    const elapsedMs = Math.max(0, nowMs - startMs);
    const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
    return remainingSeconds;
  });

  // Anti-Cheat & Violation State
  const [violations, setViolations] = useState<number>(0);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [violationModalData, setViolationModalData] = useState<{ isOpen: boolean; reason: string; count: number } | null>(null);

  // Modals
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const currentQ = questions[currentIndex];
  const participantId = sessionData.participantId;

  // Function to enter Fullscreen
  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request rejected by browser:', err);
      });
    }
  };

  // 1. Countdown Timer Hook
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  // 2. Anti-Cheat Event Listeners (Tab switch, Window blur, Visibility hidden, Fullscreen exit)
  useEffect(() => {
    // Attempt auto fullscreen on load
    enterFullscreen();

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await recordViolation('page_hidden', 'Siswa meninggalkan tab / membuka aplikasi lain');
      }
    };

    const handleBlur = async () => {
      await recordViolation('window_blur', 'Halaman ujian kehilangan fokus (window blur)');
    };

    const handleFullscreenChange = async () => {
      const activeFS = Boolean(document.fullscreenElement);
      setIsFullscreen(activeFS);
      if (!activeFS) {
        await recordViolation('fullscreen_exit', 'Siswa keluar dari mode Layar Penuh (Fullscreen)');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const recordViolation = async (eventType: string, description: string) => {
    try {
      const res = await api.recordViolation(examId, { participantId, eventType, description });
      const current = res.currentViolations;
      setViolations(current);

      // Trigger Violation Warning Modal
      setViolationModalData({
        isOpen: true,
        reason: description,
        count: current,
      });

      if (current >= sessionData.violationLimit) {
        if (sessionData.violationAction === 'stop' || sessionData.violationAction === 'lock') {
          setIsLocked(true);
          setWarningMsg(`Ujian dikunci karena telah mencapai batas maksimal kecurangan (${sessionData.violationLimit} kali).`);
        } else {
          setWarningMsg(`PERINGATAN KERAS! Catatan kecurangan Anda: ${current} / ${sessionData.violationLimit} kali.`);
        }
      } else {
        setWarningMsg(`Peringatan: Berpindah tab/layar tercatat oleh sistem pengawas CBT (${current}/${sessionData.violationLimit}).`);
        setTimeout(() => setWarningMsg(null), 8000);
      }
    } catch (err) {
      console.error('Failed to record violation', err);
    }
  };

  // 3. Save Answer Handler
  const saveAnswerToServer = async (qId: string, answerJson: any, isDoubtful: boolean) => {
    setSaveStatus('saving');
    try {
      await api.saveAnswer(examId, {
        participantId,
        questionId: qId,
        answerJson,
        isDoubtful,
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUpdateAnswer = (answerVal: any) => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id] || { answerJson: null, isDoubtful: false };
    const updated = { ...currentAns, answerJson: answerVal };

    setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
    saveAnswerToServer(currentQ.id, answerVal, updated.isDoubtful);
  };

  const toggleDoubtful = () => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id] || { answerJson: null, isDoubtful: false };
    const updated = { ...currentAns, isDoubtful: !currentAns.isDoubtful };

    setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
    saveAnswerToServer(currentQ.id, updated.answerJson, updated.isDoubtful);
  };

  const handleNavigate = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    setVisited((prev) => new Set(prev).add(index));
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.warn('Exit fullscreen failed:', err));
    }
  };

  const handleFinalSubmit = async () => {
    try {
      await api.finishExam(examId, participantId);
      exitFullscreen();
      onFinish();
    } catch (err: any) {
      alert(err.message || 'Gagal mengumpulkan ujian.');
    }
  };

  // Format Timer
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Badge Status for Question Number Palette:
  const getQuestionBadgeColor = (idx: number, qId: string) => {
    const ansObj = answers[qId];
    if (ansObj?.isDoubtful) return 'bg-amber-400 text-slate-900 border-amber-500 font-bold'; // Yellow
    if (ansObj?.answerJson !== undefined && ansObj?.answerJson !== null && ansObj?.answerJson !== '') {
      if (Array.isArray(ansObj.answerJson) && ansObj.answerJson.length === 0) {
        return visited.has(idx) ? 'bg-red-500 text-white font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500';
      }
      return 'bg-emerald-500 text-white font-bold'; // Green
    }
    return visited.has(idx) ? 'bg-red-500 text-white font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'; // Red vs Gray
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-red-400">SESI UJIAN DIKUNCI</h2>
          <p className="text-xs text-slate-300">{warningMsg}</p>
          <p className="text-[11px] text-slate-500">
            Silakan laporkan kejadian ini kepada Guru Pengawas CBT SMP Negeri 7 Muara Badak untuk membuka kunci.
          </p>
          <button
            onClick={() => {
              exitFullscreen();
              onFinish();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Kembali ke Dashboard Siswa
          </button>
        </div>
      </div>
    );
  }

  // Calculate Answered Count Summary
  const answeredCount = Object.values(answers).filter(
    (a) => a.answerJson !== null && a.answerJson !== undefined && a.answerJson !== ''
  ).length;
  const doubtfulCount = Object.values(answers).filter((a) => a.isDoubtful).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between select-none">
      {/* 1. ANBK Inspired Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Exam Info */}
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
              COMPUTER BASED TEST — SPANJU
            </span>
            <h1 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-md">
              {examTitle}
            </h1>
            <p className="text-[11px] text-slate-400">
              Siswa: <strong>{studentName}</strong> ({className})
            </p>
          </div>

          {/* Center: Server Timer & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-mono font-bold text-sm sm:text-base">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
              {saveStatus === 'saved' ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              ) : saveStatus === 'saving' ? (
                <span className="text-cyan-400 animate-pulse font-semibold">Menyimpan...</span>
              ) : (
                <span className="text-red-400 font-semibold">Gagal Menyimpan</span>
              )}
            </div>
          </div>

          {/* Right: Fullscreen Action & Question Palette */}
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Masuk Fullscreen</span>
              </button>
            )}

            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Nomor Soal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Required Warning Banner */}
      {!isFullscreen && (
        <div className="bg-amber-500 text-slate-950 font-extrabold text-xs px-4 py-2 text-center flex items-center justify-center gap-2 shadow-inner">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Mode Fullscreen Nonaktif! Klik tombol "Masuk Fullscreen" agar pengerjaan ujian aman dan tidak tercatat pelanggaran.</span>
          <button
            onClick={enterFullscreen}
            className="ml-2 underline hover:text-white font-black"
          >
            Aktifkan Sekarang
          </button>
        </div>
      )}

      {/* Warning Alert Banner */}
      {warningMsg && (
        <div className="bg-red-600 text-white font-bold text-xs px-4 py-2 text-center flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* 2. Main Question Workspace */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex-1 my-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question Card */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
            {currentQ && (
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    Soal Nomor {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Bobot: {currentQ.weight} Poin
                  </span>
                </div>

                {/* Question Image if present */}
                {currentQ.imageUrl && (
                  <div className="mb-4 max-h-60 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <img src={currentQ.imageUrl} alt="Gambar Soal" className="w-full object-contain" />
                  </div>
                )}

                {/* Question Text */}
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed mb-6">
                  {currentQ.questionText}
                </h2>

                {/* Question Options Input according to 5 Types */}

                {/* Type A: Multiple Choice (PG) */}
                {currentQ.questionType === 'multiple_choice' && (
                  <div className="space-y-2.5">
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = answers[currentQ.id]?.answerJson === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleUpdateAnswer(opt.id)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-xs font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-400'
                          }`}>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                          </span>
                          <span>{opt.optionText}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Type B: Complex Multiple Choice (PG Kompleks) */}
                {currentQ.questionType === 'complex_multiple_choice' && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mb-2">
                      * Pilihan jawaban bisa lebih dari satu. Klik opsi untuk memilih/membatalkan.
                    </p>
                    {currentQ.options?.map((opt: any) => {
                      const currentSelectedList: string[] = Array.isArray(answers[currentQ.id]?.answerJson)
                        ? answers[currentQ.id].answerJson
                        : [];
                      const isSelected = currentSelectedList.includes(opt.id);

                      const handleCheckToggle = () => {
                        let nextList = [...currentSelectedList];
                        if (isSelected) nextList = nextList.filter((id) => id !== opt.id);
                        else nextList.push(opt.id);
                        handleUpdateAnswer(nextList);
                      };

                      return (
                        <button
                          key={opt.id}
                          onClick={handleCheckToggle}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-xs font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-400'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </span>
                          <span>{opt.optionText}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Type C: True / False (Benar / Salah) */}
                {currentQ.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = answers[currentQ.id]?.answerJson === opt.id || answers[currentQ.id]?.answerJson === opt.optionText;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleUpdateAnswer(opt.id)}
                          className={`p-4 rounded-xl border text-center font-bold text-sm transition ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300 shadow-md'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {opt.optionText}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Type D: Matching (Menjodohkan) */}
                {currentQ.questionType === 'matching' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                      * Pilih pasangan Kolom B yang sesuai untuk setiap pernyataan Kolom A:
                    </p>
                    {currentQ.matchingPairs?.map((pair: any) => {
                      const savedPairMap = answers[currentQ.id]?.answerJson || {};
                      const selectedVal = savedPairMap[pair.id] || '';

                      const handleSelectPair = (val: string) => {
                        const nextMap = { ...savedPairMap, [pair.id]: val };
                        handleUpdateAnswer(nextMap);
                      };

                      return (
                        <div key={pair.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{pair.leftText}</span>
                          <select
                            value={selectedVal}
                            onChange={(e) => handleSelectPair(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            <option value="">-- Pilih Pasangan Jawaban --</option>
                            {currentQ.matchingPairs.map((pB: any) => (
                              <option key={pB.id} value={pB.rightText}>
                                {pB.rightText}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Type E: Essay (Esai) */}
                {currentQ.questionType === 'essay' && (
                  <div>
                    <textarea
                      rows={6}
                      value={answers[currentQ.id]?.answerJson || ''}
                      onChange={(e) => handleUpdateAnswer(e.target.value)}
                      placeholder="Tuliskan jawaban esai Anda secara lengkap dan jelas di sini..."
                      className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * Jawaban tersimpan otomatis secara berkala saat Anda mengetik.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={toggleDoubtful}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  answers[currentQ?.id]?.isDoubtful
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-500/30'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{answers[currentQ?.id]?.isDoubtful ? 'Ditandai Ragu-Ragu' : 'Tandai Ragu-Ragu'}</span>
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={() => setIsConfirmFinishOpen(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesaikan Ujian</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNavigate(currentIndex + 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Navigasi Nomor Soal ({answeredCount}/{questions.length} Terjawab)
            </h3>

            {/* Legend Badges */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Hijau: Dijawab</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span>Merah: Belum</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span>Kuning: Ragu</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span>Abu: Belum Dikunjungi</span>
              </span>
            </div>

            {/* Grid Palette */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pt-2">
              {questions.map((q, idx) => {
                const colorClass = getQuestionBadgeColor(idx, q.id);
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigate(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition flex items-center justify-center relative ${colorClass} ${
                      isCurrent ? 'ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsConfirmFinishOpen(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Selesaikan & Kumpulkan</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Real-time Violation Warning Modal Alert */}
      {violationModalData && violationModalData.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setViolationModalData(null)}
          title="⚠️ PERINGATAN PELANGGARAN CBT"
          maxWidth="md"
        >
          <div className="space-y-4 text-center p-2">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">
              Terdeteksi Akses Keluar Layar Ujian!
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Detail Kejadian: <strong className="text-red-500">{violationModalData.reason}</strong>
            </p>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-300">
              Total Catatan Pelanggaran: {violationModalData.count} / {sessionData.violationLimit} kali
            </div>
            <p className="text-[11px] text-slate-500">
              Tetap berada pada tampilan ujian CBT. Jika melebihi batas {sessionData.violationLimit} kali, pengerjaan Anda akan terkunci otomatis oleh sistem pengawas.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setViolationModalData(null);
                  enterFullscreen();
                }}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition"
              >
                Saya Mengerti, Kembali Mengerjakan (Masuk Fullscreen)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog before Final Submission */}
      <Modal
        isOpen={isConfirmFinishOpen}
        onClose={() => setIsConfirmFinishOpen(false)}
        title="Konfirmasi Selesaikan Ujian CBT"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Periksa ringkasan pengerjaan Anda sebelum mengumpulkan lembar ujian:
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
              <span className="block text-lg font-bold">{answeredCount}</span>
              <span>Terjawab</span>
            </div>
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300">
              <span className="block text-lg font-bold">{questions.length - answeredCount}</span>
              <span>Belum Dijawab</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
              <span className="block text-lg font-bold">{doubtfulCount}</span>
              <span>Ragu-Ragu</span>
            </div>
          </div>

          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            * Jawaban tidak dapat diubah kembali setelah ujian dikumpulkan.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsConfirmFinishOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Kembali Mengerjakan
            </button>
            <button
              onClick={() => {
                setIsConfirmFinishOpen(false);
                handleFinalSubmit();
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            >
              Ya, Kumpulkan Sekarang
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
