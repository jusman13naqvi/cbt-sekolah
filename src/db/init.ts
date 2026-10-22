import { db } from './index';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  console.log('[DB Init] Creating database schema tables...');

  // 1. School Settings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS school_settings (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      npsn TEXT DEFAULT '30401234',
      is_ksrg INTEGER DEFAULT 1,
      logo_url TEXT DEFAULT '',
      address TEXT DEFAULT 'Jl. Pendidikan No. 07, Muara Badak, Kutai Kartanegara',
      phone TEXT DEFAULT '0812-3456-7890',
      email TEXT DEFAULT 'info@smpn7muarabadak.sch.id',
      default_violation_limit INTEGER DEFAULT 3,
      default_violation_action TEXT DEFAULT 'warn',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Users
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      full_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Teachers
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nip TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Classes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      grade_level INTEGER NOT NULL,
      homeroom_teacher TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Students
  await db.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nisn TEXT UNIQUE DEFAULT '',
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
      class_name TEXT NOT NULL,
      gender TEXT DEFAULT 'L',
      initial_password TEXT DEFAULT 'spanju123',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Class Students relation
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_students (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      UNIQUE(class_id, student_id)
    )
  `);

  // 7. Subjects
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Teacher Classes relation
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teacher_classes (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL
    )
  `);

  // 9. Exams
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      class_name TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      kkm REAL NOT NULL DEFAULT 75,
      token TEXT DEFAULT '',
      is_token_required INTEGER DEFAULT 1,
      total_questions INTEGER DEFAULT 0,
      total_weight REAL DEFAULT 100,
      shuffle_questions INTEGER DEFAULT 1,
      shuffle_options INTEGER DEFAULT 1,
      violation_limit INTEGER DEFAULT 3,
      violation_action TEXT DEFAULT 'warn',
      auto_release_score INTEGER DEFAULT 1,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 10. Questions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      weight REAL DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 11. Question Options
  await db.execute(`
    CREATE TABLE IF NOT EXISTS question_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      image_url TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0
    )
  `);

  // 12. Matching Pairs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS matching_pairs (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      left_text TEXT NOT NULL,
      right_text TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    )
  `);

  // 13. Exam Participants
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_participants (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_nisn TEXT DEFAULT '',
      class_name TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      start_time TEXT,
      submit_time TEXT,
      score REAL DEFAULT 0,
      is_passed INTEGER DEFAULT 0,
      essay_graded_count INTEGER DEFAULT 0,
      total_essay_count INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      camera_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, student_id)
    )
  `);

  // 14. Answers
  await db.execute(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES exam_participants(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      answer_json TEXT DEFAULT '',
      is_doubtful INTEGER DEFAULT 0,
      score_obtained REAL DEFAULT 0,
      is_graded INTEGER DEFAULT 0,
      graded_at TEXT,
      graded_by TEXT,
      teacher_notes TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, question_id)
    )
  `);

  // 15. Exam Violations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_violations (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES exam_participants(id) ON DELETE CASCADE,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 16. Audit Logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '',
      username TEXT DEFAULT '',
      role TEXT DEFAULT '',
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default school settings if empty
  const settingsCheck = await db.execute(`SELECT COUNT(*) as count FROM school_settings`);
  if (Number(settingsCheck.rows[0].count) === 0) {
    await db.execute({
      sql: `INSERT INTO school_settings (id, school_name, npsn, is_ksrg, address, phone, email, default_violation_limit, default_violation_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'setting_1',
        'SMP Negeri 7 Muara Badak',
        '30401234',
        1,
        'Jl. Pendidikan No. 07, Muara Badak, Kutai Kartanegara, Kaltim',
        '0812-3456-7890',
        'info@smpn7muarabadak.sch.id',
        3,
        'warn',
      ],
    });
  }

  // Seed initial Admin user if empty
  const adminCheck = await db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
  if (Number(adminCheck.rows[0].count) === 0) {
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    await db.execute({
      sql: `INSERT INTO users (id, username, password, role, full_name, is_active)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['u_admin_1', 'admin', hashedAdminPassword, 'admin', 'Administrator SPANJU', 1],
    });
    console.log('[DB Seed] Seeded default admin user (username: admin, password: admin123)');
  }

  // Seed Classes if empty
  const classCheck = await db.execute(`SELECT COUNT(*) as count FROM classes`);
  if (Number(classCheck.rows[0].count) === 0) {
    const defaultClasses = [
      { id: 'c_7a', name: '7A', grade: 7, homeroom: '' },
      { id: 'c_7b', name: '7B', grade: 7, homeroom: '' },
      { id: 'c_8a', name: '8A', grade: 8, homeroom: '' },
      { id: 'c_8b', name: '8B', grade: 8, homeroom: '' },
      { id: 'c_8c', name: '8C', grade: 8, homeroom: '' },
      { id: 'c_9a', name: '9A', grade: 9, homeroom: '' },
      { id: 'c_9b', name: '9B', grade: 9, homeroom: '' },
    ];
    for (const c of defaultClasses) {
      await db.execute({
        sql: `INSERT INTO classes (id, name, grade_level, homeroom_teacher, is_active) VALUES (?, ?, ?, ?, 1)`,
        args: [c.id, c.name, c.grade, c.homeroom],
      });
    }
    console.log('[DB Seed] Seeded default classes 7A to 9B');
  }

  // Seed Subjects if empty
  const subjectCheck = await db.execute(`SELECT COUNT(*) as count FROM subjects`);
  if (Number(subjectCheck.rows[0].count) === 0) {
    const defaultSubjects = [
      { id: 'sub_inf', name: 'Informatika', code: 'INF' },
      { id: 'sub_bind', name: 'Bahasa Indonesia', code: 'BIND' },
      { id: 'sub_mtk', name: 'Matematika', code: 'MTK' },
      { id: 'sub_ipa', name: 'Ilmu Pengetahuan Alam (IPA)', code: 'IPA' },
      { id: 'sub_ips', name: 'Ilmu Pengetahuan Sosial (IPS)', code: 'IPS' },
      { id: 'sub_bing', name: 'Bahasa Inggris', code: 'BING' },
    ];
    for (const s of defaultSubjects) {
      await db.execute({
        sql: `INSERT INTO subjects (id, name, code, is_active) VALUES (?, ?, ?, 1)`,
        args: [s.id, s.name, s.code],
      });
    }
    console.log('[DB Seed] Seeded default school subjects');
  }

  // Purge demo records (teachers, students, non-admin users, exams, questions, results) to ensure clean production database
  try {
    await db.execute(`DELETE FROM exam_violations`);
    await db.execute(`DELETE FROM answers`);
    await db.execute(`DELETE FROM exam_participants`);
    await db.execute(`DELETE FROM matching_pairs`);
    await db.execute(`DELETE FROM question_options`);
    await db.execute(`DELETE FROM questions`);
    await db.execute(`DELETE FROM exams`);
    await db.execute(`DELETE FROM class_students`);
    await db.execute(`DELETE FROM teacher_classes`);
    await db.execute(`DELETE FROM students`);
    await db.execute(`DELETE FROM teachers`);
    await db.execute(`DELETE FROM users WHERE role != 'admin'`);
    console.log('[DB Purge] Successfully purged all demo accounts, exams, and student records.');
  } catch (purgeError) {
    console.error('[DB Purge Error]', purgeError);
  }

  console.log('[DB Init] Database initialization complete.');
}
