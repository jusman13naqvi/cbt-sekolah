export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  nip?: string;
  nisn?: string;
  className?: string;
  classId?: string;
  gender?: string;
  initialPassword?: string;
  createdAt: string;
}

export interface SchoolSettings {
  id: string;
  schoolName: string;
  npsn: string;
  isKsrg: boolean; // Kandidat Sekolah Rujukan Google
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  defaultViolationLimit: number;
  defaultViolationAction: 'warn' | 'lock' | 'stop';
  updatedAt: string;
}

export interface Teacher {
  id: string;
  userId: string;
  nip: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g., '7A', '7B', '8A', '8B', '8C', '9A', '9B'
  gradeLevel: number; // 7, 8, 9
  homeroomTeacher: string;
  isActive: boolean;
  studentCount?: number;
  createdAt: string;
}

export interface Student {
  id: string;
  userId: string;
  nisn: string;
  fullName: string;
  username: string;
  classId: string;
  className: string;
  gender: 'L' | 'P' | 'Lainnya';
  initialPassword?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export type QuestionType =
  | 'multiple_choice'
  | 'complex_multiple_choice'
  | 'true_false'
  | 'matching'
  | 'essay';

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  imageUrl?: string;
  orderIndex: number;
}

export interface MatchingPair {
  id: string;
  questionId: string;
  leftText: string;
  rightText: string;
  orderIndex: number;
}

export interface Question {
  id: string;
  examId: string;
  questionType: QuestionType;
  questionText: string;
  imageUrl?: string;
  weight: number;
  orderIndex: number;
  options?: QuestionOption[];
  matchingPairs?: MatchingPair[];
}

export type ExamStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  kkm: number;
  token: string;
  isTokenRequired: boolean;
  totalQuestions: number;
  totalWeight: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  violationLimit: number;
  violationAction: 'warn' | 'lock' | 'stop';
  autoReleaseScore: boolean;
  status: ExamStatus;
  createdAt: string;
}

export interface StudentAnswer {
  questionId: string;
  answerJson: any; // PG: string optionId, Complex: string[] optionIds, True/False: boolean or object, Matching: {[pairId]: rightText}, Essay: string
  isDoubtful: boolean;
  scoreObtained?: number;
  isGraded?: boolean;
  teacherNotes?: string;
  updatedAt?: string;
}

export type ParticipantStatus = 'not_started' | 'in_progress' | 'submitted' | 'locked' | 'graded';

export interface ExamParticipant {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  className: string;
  status: ParticipantStatus;
  startTime?: string;
  submitTime?: string;
  score?: number;
  isPassed?: boolean;
  essayGradedCount?: number;
  totalEssayCount?: number;
  violationCount: number;
  cameraActive: boolean;
  answers?: Record<string, StudentAnswer>;
  createdAt: string;
}

export interface ExamViolation {
  id: string;
  participantId: string;
  examId: string;
  studentId: string;
  eventType:
    | 'tab_switch'
    | 'window_blur'
    | 'fullscreen_exit'
    | 'page_hidden'
    | 'network_offline'
    | 'reopen_attempt'
    | 'other';
  description: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface StudentImportRow {
  rowNum: number;
  nisn: string;
  fullName: string;
  username: string;
  className: string;
  gender: 'L' | 'P';
  password?: string;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}
