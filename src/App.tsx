import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherManagement } from './components/admin/TeacherManagement';
import { StudentManagement } from './components/admin/StudentManagement';
import { ClassManagement } from './components/admin/ClassManagement';
import { SchoolSettingsView } from './components/admin/SchoolSettings';
import { AuditLogsView } from './components/admin/AuditLogs';
import { BackupRestoreView } from './components/admin/BackupRestore';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { api, getStoredUser, removeAuthToken, removeStoredUser } from './services/api';
import { SchoolSettings } from './types';

export function App() {
  const [user, setUser] = useState<any>(() => getStoredUser());
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Sync dark mode class on <html> & <body>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Load School Settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        setSchoolSettings(data);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    }
    loadSettings();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    removeStoredUser();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        user={user}
        schoolSettings={schoolSettings}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar role={user.role} activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-50/80 dark:bg-slate-900/50 min-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* ADMIN VIEWS */}
            {user.role === 'admin' && (
              <>
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'teachers' && <TeacherManagement />}
                {activeTab === 'students' && <StudentManagement />}
                {activeTab === 'classes' && <ClassManagement />}
                {activeTab === 'settings' && <SchoolSettingsView />}
                {activeTab === 'audit' && <AuditLogsView />}
                {activeTab === 'backup' && <BackupRestoreView />}
              </>
            )}

            {/* TEACHER VIEWS */}
            {user.role === 'teacher' && (
              <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
            )}

            {/* STUDENT VIEWS */}
            {user.role === 'student' && (
              <StudentDashboard user={user} activeTab={activeTab} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
