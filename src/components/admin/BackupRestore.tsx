import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';

export const BackupRestoreView: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [backupPayload, setBackupPayload] = useState<any>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const data = await api.backupDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_spanju_cbt_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh file backup database.');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setRestoreMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.app !== 'PJJ_SPANJU_CBT') {
          throw new Error('File backup tidak valid untuk PJJ SPANJU CBT.');
        }
        setBackupPayload(json);
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal membaca format JSON file backup.');
        setBackupPayload(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleExecuteRestore = async () => {
    if (!backupPayload) return;
    setRestoring(true);
    setErrorMsg(null);

    try {
      const res = await api.restoreDatabase(backupPayload);
      setRestoreMsg(res.message);
      setBackupPayload(null);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulihkan database dari backup.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Backup & Pemulihan Database (Turso / SQLite)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Unduh file cadangan database JSON secara aman atau pulihkan data dari file cadangan sebelumnya.
        </p>
      </div>

      {/* Backup Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              1. Unduh Cadangan Database (JSON Backup)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mengekspor seluruh data profil sekolah, guru, siswa, kelas, mata pelajaran, ujian, soal, jawaban, dan log aktivitas.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadBackup}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
        >
          {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>Unduh Backup Database Sekarang</span>
        </button>
      </div>

      {/* Restore Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              2. Pemulihan Data dari Cadangan JSON
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih file cadangan .json yang sebelumnya telah diunduh dari aplikasi PJJ SPANJU.
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            id="backup-file-input"
            className="hidden"
          />
          <label htmlFor="backup-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
            <Upload className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Pilih file backup .json dari komputer'}
            </span>
          </label>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {restoreMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{restoreMsg}</span>
          </div>
        )}

        {backupPayload && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <p className="font-bold">Pratinjau Isi Cadangan:</p>
              <p>• Versi Aplikasi: {backupPayload.version}</p>
              <p>• Tanggal Backup: {new Date(backupPayload.exportedAt).toLocaleString('id-ID')}</p>
              <p>• Jumlah Kelas: {backupPayload.classes?.length || 0}</p>
              <p>• Jumlah Siswa: {backupPayload.students?.length || 0}</p>
              <p>• Jumlah Ujian CBT: {backupPayload.exams?.length || 0}</p>
            </div>

            <button
              onClick={() => setIsConfirmOpen(true)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition"
            >
              Pulihkan Database Sekarang
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteRestore}
        title="Konfirmasi Pemulihan Database"
        message="Proses pemulihan akan memperbarui tabel kelas, siswa, mata pelajaran, dan konfigurasi dari file backup. Lanjutkan?"
        isDangerous={false}
      />
    </div>
  );
};
