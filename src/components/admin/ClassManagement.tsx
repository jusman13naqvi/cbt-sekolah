import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../Modal';
import { ConfirmDialog } from '../ConfirmDialog';

export const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(7);
  const [homeroomTeacher, setHomeroomTeacher] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClass({ name, gradeLevel, homeroomTeacher });
      setIsOpen(false);
      setName('');
      setHomeroomTeacher('');
      loadClasses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteClass(deleteTarget.id);
      setDeleteTarget(null);
      loadClasses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Kelola Kelas & Rombel (7A - 9B)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tambah dan kelola daftar kelas peserta Pembelajaran Jarak Jauh (PJJ) & CBT.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold text-lg border border-cyan-500/20">
                  Kelas {c.name}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tingkat {c.gradeLevel}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">Wali Kelas:</strong>{' '}
                  {c.homeroomTeacher || 'Belum Ditentukan'}
                </p>
                <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  <span>{c.studentCount} Siswa Terdaftar</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDeleteTarget(c)}
                className="p-1.5 rounded-lg border border-red-300 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs transition"
                title="Hapus Kelas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Class Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Tambah Kelas Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Kelas (contoh: 7A, 8B, 9C) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="7A"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tingkat Kelas *
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            >
              <option value={7}>Tingkat 7 (Kelas VII)</option>
              <option value={8}>Tingkat 8 (Kelas VIII)</option>
              <option value={9}>Tingkat 9 (Kelas IX)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Wali Kelas
            </label>
            <input
              type="text"
              value={homeroomTeacher}
              onChange={(e) => setHomeroomTeacher(e.target.value)}
              placeholder="Dra. Hj. Siti Aminah"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold text-xs shadow-md"
            >
              Simpan Kelas
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus Kelas ${deleteTarget?.name}?`}
      />
    </div>
  );
};
