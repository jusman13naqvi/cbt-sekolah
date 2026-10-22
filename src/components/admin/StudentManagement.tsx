import React, { useEffect, useState } from 'react';
import { UserPlus, Upload, Edit2, Trash2, Key, Check, X, Search, RefreshCw, Filter, CheckSquare, Square } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../Modal';
import { ConfirmDialog } from '../ConfirmDialog';
import { StudentImportModal } from './StudentImportModal';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [search, setSearch] = useState('');

  // Mass Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nisn, setNisn] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [isActive, setIsActive] = useState(true);
  const [resetPassword, setResetPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stData, clsData] = await Promise.all([
        api.getStudents(selectedClassId, search),
        api.getClasses(),
      ]);
      setStudents(stData);
      setClasses(clsData);
      if (clsData.length > 0 && !classId) {
        setClassId(clsData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClassId]);

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setPassword('');
    setNisn('');
    setGender('L');
    setIsActive(true);
    setResetPassword('');
    setFormError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const targetClass = classes.find((c) => c.id === classId);
      await api.createStudent({
        fullName,
        username,
        password,
        nisn,
        classId,
        className: targetClass?.name || '7A',
        gender,
      });
      setIsAddOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleEditOpen = (st: any) => {
    setSelectedStudent(st);
    setFullName(st.fullName);
    setNisn(st.nisn || '');
    setClassId(st.classId);
    setGender(st.gender || 'L');
    setIsActive(st.isActive);
    setResetPassword('');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const targetClass = classes.find((c) => c.id === classId);
      await api.updateStudent(selectedStudent.id, {
        fullName,
        nisn,
        classId,
        className: targetClass?.name || selectedStudent.className,
        gender,
        isActive,
        resetPassword: resetPassword.trim() || undefined,
      });
      setIsEditOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBatchDeleteConfirm = async () => {
    try {
      await api.batchDeleteStudents(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsBatchDeleteOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header & Main Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Kelola Data Siswa
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tambah siswa, impor massal dari Excel, ubah kelas, reset password, dan hapus akun siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBatchDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Excel / CSV</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4 text-cyan-500" />
            <span>Filter Kelas:</span>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">Semua Kelas (7A-9B)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Kelas {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NISN, atau username..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.size > 0 && selectedIds.size === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-cyan-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-4">No</th>
                <th className="p-4">NISN</th>
                <th className="p-4">Nama Lengkap Siswa</th>
                <th className="p-4">Username</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">L/P</th>
                <th className="p-4">Password Awal</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan pada kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const isChecked = selectedIds.has(st.id);
                  return (
                    <tr key={st.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition ${isChecked ? 'bg-cyan-50/50 dark:bg-cyan-950/20' : ''}`}>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelectOne(st.id)}>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-cyan-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-mono">{st.nisn || '-'}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{st.fullName}</td>
                      <td className="p-4 font-mono text-cyan-600 dark:text-cyan-400">@{st.username}</td>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400">{st.className}</td>
                      <td className="p-4 font-semibold">{st.gender}</td>
                      <td className="p-4 font-mono text-slate-500">{st.initialPassword || 'spanju123'}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditOpen(st)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 transition"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(st)}
                          className="p-1.5 rounded-lg border border-red-300 dark:border-red-900/50 hover:bg-red-50 text-red-600 dark:text-red-400 transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Student */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Siswa Baru">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap Siswa *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Ananda Rizky Pratama"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NISN</label>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="0081234567"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kelas *</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Username Login *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ananda008"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="spanju123"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="gender"
                  value="L"
                  checked={gender === 'L'}
                  onChange={() => setGender('L')}
                />
                <span>Laki-Laki (L)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="gender"
                  value="P"
                  checked={gender === 'P'}
                  onChange={() => setGender('P')}
                />
                <span>Perempuan (P)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
            >
              Simpan Data Siswa
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Student */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Data Siswa">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">NISN</label>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reset Password (Opsional)
            </label>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin reset password"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <StudentImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={loadData}
        classList={classes}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteTarget?.fullName}"?`}
      />

      {/* Batch Delete Confirmation */}
      <ConfirmDialog
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title="Hapus Massal Data Siswa"
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.size} siswa terpilih sekaligus?`}
      />
    </div>
  );
};
