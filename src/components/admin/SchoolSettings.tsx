import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Save, CheckCircle2, Upload, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';

export const SchoolSettingsView: React.FC = () => {
  const [schoolName, setSchoolName] = useState('');
  const [npsn, setNpsn] = useState('');
  const [isKsrg, setIsKsrg] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [defaultViolationLimit, setDefaultViolationLimit] = useState(3);
  const [defaultViolationAction, setDefaultViolationAction] = useState('warn');

  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await api.getSettings();
        setSchoolName(s.schoolName);
        setNpsn(s.npsn);
        setIsKsrg(s.isKsrg);
        setLogoUrl(s.logoUrl || '');
        setAddress(s.address);
        setPhone(s.phone);
        setEmail(s.email);
        setDefaultViolationLimit(s.defaultViolationLimit);
        setDefaultViolationAction(s.defaultViolationAction);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file gambar logo maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setLogoUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        schoolName,
        npsn,
        isKsrg,
        logoUrl,
        address,
        phone,
        email,
        defaultViolationLimit,
        defaultViolationAction,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Profil Sekolah & Pengaturan CBT SPANJU
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Atur logo resmi sekolah, identitas NPSN, status KSRG Google, dan kebijakan pelanggaran ujian.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan profil sekolah & logo berhasil disimpan!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300">
          <ShieldCheck className="w-5 h-5 text-cyan-500 shrink-0" />
          <span>
            Logo dan nama sekolah ini ditampilkan pada Halaman Login, Header Aplikasi, Kop Lembar Ujian, serta Laporan Ekspor.
          </span>
        </div>

        {/* School Logo Uploader */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Logo Resmi Sekolah
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {logoUrl ? (
                <img src={logoUrl} alt="Preview Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah File Logo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Atau masukkan URL Logo (https://...)"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Sekolah Resmi *
          </label>
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NPSN</label>
            <input
              type="text"
              value={npsn}
              onChange={(e) => setNpsn(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Candidate Google Reference School (KSRG)
            </label>
            <select
              value={isKsrg ? '1' : '0'}
              onChange={(e) => setIsKsrg(e.target.value === '1')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold"
            >
              <option value="1">Aktif (Kandidat Sekolah Rujukan Google)</option>
              <option value="0">Nonaktif</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Alamat Sekolah Lengkap
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telepon</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Resmi</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
            Kebijakan Batas Pelanggaran CBT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Batas Default Kejadian
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={defaultViolationLimit}
                onChange={(e) => setDefaultViolationLimit(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tindakan saat Batas Tercapai
              </label>
              <select
                value={defaultViolationAction}
                onChange={(e) => setDefaultViolationAction(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
              >
                <option value="warn">Peringatan Keras kepada Siswa</option>
                <option value="lock">Kunci Pengerjaan Sementara</option>
                <option value="stop">Hentikan Ujian Secara Otomatis</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
