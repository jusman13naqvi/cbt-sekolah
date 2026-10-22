const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('spanju_token');
export const setAuthToken = (token: string) => localStorage.getItem('spanju_token') || localStorage.setItem('spanju_token', token);
export const removeAuthToken = () => localStorage.removeItem('spanju_token');

export const getStoredUser = () => {
  const u = localStorage.getItem('spanju_user');
  return u ? JSON.parse(u) : null;
};

export const setStoredUser = (user: any) => {
  localStorage.setItem('spanju_user', JSON.stringify(user));
};

export const removeStoredUser = () => localStorage.removeItem('spanju_user');

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
  }
  return data;
}

export const api = {
  // Time
  getServerTime: () => request('/time'),

  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  changePassword: (data: any) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // School Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings: any) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getTeachers: () => request('/admin/teachers'),
  createTeacher: (data: any) => request('/admin/teachers', { method: 'POST', body: JSON.stringify(data) }),
  updateTeacher: (id: string, data: any) => request(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeacher: (id: string) => request(`/admin/teachers/${id}`, { method: 'DELETE' }),

  getStudents: (classId?: string, search?: string) => {
    let q = '';
    if (classId) q += `classId=${classId}&`;
    if (search) q += `search=${encodeURIComponent(search)}`;
    return request(`/admin/students${q ? '?' + q : ''}`);
  },
  createStudent: (data: any) => request('/admin/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: any) => request(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: string) => request(`/admin/students/${id}`, { method: 'DELETE' }),
  batchDeleteStudents: (studentIds: string[]) => request('/admin/students/batch-delete', { method: 'POST', body: JSON.stringify({ studentIds }) }),
  importStudents: (studentData: any[]) => request('/admin/students/import', { method: 'POST', body: JSON.stringify({ studentData }) }),

  getClasses: () => request('/admin/classes'),
  createClass: (data: any) => request('/admin/classes', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id: string, data: any) => request(`/admin/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClass: (id: string) => request(`/admin/classes/${id}`, { method: 'DELETE' }),

  getAuditLogs: () => request('/admin/audit-logs'),
  getDbHealth: () => request('/admin/db-health'),
  backupDatabase: () => request('/admin/backup'),
  restoreDatabase: (data: any) => request('/admin/restore', { method: 'POST', body: JSON.stringify(data) }),

  // Teacher
  getSubjects: () => request('/teacher/subjects'),
  createSubject: (data: any) => request('/teacher/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: any) => request(`/teacher/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id: string) => request(`/teacher/subjects/${id}`, { method: 'DELETE' }),
  getTeacherExams: () => request('/teacher/exams'),
  getExamDetail: (id: string) => request(`/teacher/exams/${id}`),
  createExam: (data: any) => request('/teacher/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id: string, data: any) => request(`/teacher/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExam: (id: string) => request(`/teacher/exams/${id}`, { method: 'DELETE' }),
  duplicateExam: (id: string) => request(`/teacher/exams/${id}/duplicate`, { method: 'POST' }),

  addQuestion: (examId: string, data: any) => request(`/teacher/exams/${examId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (qId: string, data: any) => request(`/teacher/questions/${qId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (qId: string) => request(`/teacher/questions/${qId}`, { method: 'DELETE' }),

  getExamParticipants: (examId: string) => request(`/teacher/exams/${examId}/participants`),
  resetParticipantExam: (participantId: string) => request(`/teacher/participants/${participantId}/reset-exam`, { method: 'POST' }),
  resetParticipantViolations: (participantId: string) => request(`/teacher/participants/${participantId}/reset-violations`, { method: 'POST' }),
  getEssayAnswers: (examId: string) => request(`/teacher/exams/${examId}/essay-answers`),
  gradeEssayAnswer: (answerId: string, data: any) => request(`/teacher/answers/${answerId}/grade`, { method: 'POST', body: JSON.stringify(data) }),
  releaseScores: (examId: string, autoReleaseScore: boolean) => request(`/teacher/exams/${examId}/release-scores`, { method: 'POST', body: JSON.stringify({ autoReleaseScore }) }),

  // Student CBT
  getStudentExams: () => request('/student/exams'),
  startExam: (examId: string, tokenInput?: string) => request(`/student/exams/${examId}/start`, { method: 'POST', body: JSON.stringify({ tokenInput }) }),
  saveAnswer: (examId: string, data: any) => request(`/student/exams/${examId}/answers`, { method: 'POST', body: JSON.stringify(data) }),
  recordViolation: (examId: string, data: any) => request(`/student/exams/${examId}/violations`, { method: 'POST', body: JSON.stringify(data) }),
  finishExam: (examId: string, participantId: string) => request(`/student/exams/${examId}/finish`, { method: 'POST', body: JSON.stringify({ participantId }) }),
  getStudentResults: () => request('/student/results'),
};
