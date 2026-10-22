import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../Modal';
import { parseExcelFile, downloadStudentTemplate } from '../../services/excel';
import { api } from '../../services/api';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  classList: any[];
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  classList,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const json = await parseExcelFile(selectedFile);
      setParsedRows(json);
    } catch (err: any) {
      setErrorMsg(err.message);
      setParsedRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setErrorMsg(null);

    try {
      const res = await api.importStudents(parsedRows);
      setImportResult(res);
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses impor massal siswa.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Impor Massal Data Siswa (Excel / CSV)" maxWidth="4xl">
      <div className="space-y-6">
        {/* Step 1: Download Template & Instructions */}
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-cyan-600 dark:text-cyan-400">Petunjuk Impor Massal Data Siswa:</p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400">
              Gunakan format file Excel (.xlsx) atau CSV dengan kolom header: NISN, Nama Lengkap, Username, Kelas (contoh: 7A, 8A, 9A), Jenis Kelamin (L/P), dan Password.
            </p>
          </div>
          <button
            onClick={downloadStudentTemplate}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Template Excel</span>
          </button>
        </div>

        {/* Step 2: Select File */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-cyan-500 transition">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            id="student-excel-input"
            className="hidden"
          />
          <label htmlFor="student-excel-input" className="cursor-pointer flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-cyan-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Pilih file Excel XLSX / CSV dari komputer Anda'}
            </span>
            <span className="text-xs text-slate-400">Format disukai: .xlsx atau .csv</span>
          </label>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Preview parsed file */}
        {loading && (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
            <span>Membaca data file Excel...</span>
          </div>
        )}

        {parsedRows.length > 0 && !importResult && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pratinjau Data Impor ({parsedRows.length} Baris Terdeteksi):
              </span>
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {importing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Mulai Impor {parsedRows.length} Siswa</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">NISN</th>
                    <th className="p-2.5">Nama Lengkap</th>
                    <th className="p-2.5">Username</th>
                    <th className="p-2.5">Kelas</th>
                    <th className="p-2.5">L/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono">{row.NISN || row.nisn || '-'}</td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {row['Nama Lengkap'] || row.fullName || '-'}
                      </td>
                      <td className="p-2.5 text-cyan-600 dark:text-cyan-400 font-mono">
                        {row.Username || row.username || '-'}
                      </td>
                      <td className="p-2.5">{row.Kelas || row.className || '-'}</td>
                      <td className="p-2.5">{row['Jenis Kelamin'] || row.gender || 'L'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-[11px] text-slate-400 mt-1">
                * Menampilkan 50 baris pertama dari total {parsedRows.length} baris.
              </p>
            )}
          </div>
        )}

        {/* Import Results Summary */}
        {importResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{importResult.message}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs">
                <span className="block font-extrabold text-lg">{importResult.successCount}</span>
                <span>Berhasil Diimpor</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
                <span className="block font-extrabold text-lg">{importResult.skippedCount}</span>
                <span>Dilewati (Duplikat)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs">
                <span className="block font-extrabold text-lg">{importResult.failedCount}</span>
                <span>Gagal / Format Salah</span>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-3 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Rincian Catatan Impor:</p>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {importResult.errors.map((e: any, idx: number) => (
                    <p key={idx}>{e.reason}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
