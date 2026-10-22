import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await api.getSettings();
        setSchoolSettings(settings);
      } catch (err) {
        console.error('Failed to load school settings on login', err);
      }
    }
    loadSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login({ username, password });
      setAuthToken(data.token);
      setStoredUser(data.user);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa kembali username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-md text-center pt-6 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          {schoolSettings?.isKsrg ? 'Kandidat Sekolah Rujukan Google (KSRG)' : 'Aplikasi CBT Online'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          PJJ SPANJU — CBT
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {schoolSettings?.schoolName || 'SMP Negeri 7 Muara Badak'}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-auto z-10">
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-cyan-500/20 p-1">
            {schoolSettings?.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-contain bg-white/90 rounded-xl p-1"
              />
            ) : (
              '7'
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Username / NISN
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau NISN"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk Aplikasi</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Uji Coba Cepat (Demo Users)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemo('admin', 'admin123')}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-purple-300 font-medium text-center transition"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickDemo('guruinf', 'guru123')}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-cyan-300 font-medium text-center transition"
            >
              Guru Inf
            </button>
            <button
              onClick={() => handleQuickDemo('siswa7a', 'siswa123')}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-emerald-300 font-medium text-center transition"
            >
              Siswa 7A
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-500 z-10">
        <p>© 2026 PJJ SPANJU — {schoolSettings?.schoolName || 'SMP Negeri 7 Muara Badak'}. All rights reserved.</p>
      </footer>
    </div>
  );
};
