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
      { id: 'c_7a', name: '7A', grade: 7, homeroom: 'Dra. Hj. Siti Aminah' },
      { id: 'c_7b', name: '7B', grade: 7, homeroom: 'Budi Santoso, S.Pd.' },
      { id: 'c_8a', name: '8A', grade: 8, homeroom: 'Rina Wijaya, S.Kom.' },
      { id: 'c_8b', name: '8B', grade: 8, homeroom: 'Ahmad Dahlan, M.Pd.' },
      { id: 'c_8c', name: '8C', grade: 8, homeroom: 'Eka Putri, S.Si.' },
      { id: 'c_9a', name: '9A', grade: 9, homeroom: 'Hendra Gunawan, S.T.' },
      { id: 'c_9b', name: '9B', grade: 9, homeroom: 'Siti Nurhaliza, S.Pd.' },
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

  // Seed sample Teacher if empty
  const teacherCheck = await db.execute(`SELECT COUNT(*) as count FROM teachers`);
  if (Number(teacherCheck.rows[0].count) === 0) {
    const hashedTeacherPassword = await bcrypt.hash('guru123', 10);
    await db.execute({
      sql: `INSERT INTO users (id, username, password, role, full_name, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      args: ['u_guru_inf', 'guruinf', hashedTeacherPassword, 'teacher', 'Rina Wijaya, S.Kom. (Guru Informatika)', 1],
    });
    await db.execute({
      sql: `INSERT INTO teachers (id, user_id, nip, email, phone) VALUES (?, ?, ?, ?, ?)`,
      args: ['t_guru_inf', 'u_guru_inf', '198803152015032001', 'rina.wijaya@spanju.sch.id', '081298765432'],
    });
    console.log('[DB Seed] Seeded sample teacher (username: guruinf, password: guru123)');
  }

  // Seed sample Student if empty
  const studentCheck = await db.execute(`SELECT COUNT(*) as count FROM students`);
  if (Number(studentCheck.rows[0].count) === 0) {
    const hashedStudentPassword = await bcrypt.hash('siswa123', 10);
    const sampleStudents = [
      { id: 's_sis_1', uid: 'u_sis_1', username: 'siswa7a', nisn: '0081234567', name: 'Ananda Rizky', classId: 'c_7a', className: '7A', gender: 'L' },
      { id: 's_sis_2', uid: 'u_sis_2', username: 'siswa7a_2', nisn: '0081234568', name: 'Siti Badriah', classId: 'c_7a', className: '7A', gender: 'P' },
      { id: 's_sis_3', uid: 'u_sis_3', username: 'siswa8a', nisn: '0071234569', name: 'Budi Kurniawan', classId: 'c_8a', className: '8A', gender: 'L' },
      { id: 's_sis_4', uid: 'u_sis_4', username: 'siswa9a', nisn: '0061234570', name: 'Dewi Sartika', classId: 'c_9a', className: '9A', gender: 'P' },
    ];
    for (const s of sampleStudents) {
      await db.execute({
        sql: `INSERT INTO users (id, username, password, role, full_name, is_active) VALUES (?, ?, ?, 'student', ?, 1)`,
        args: [s.uid, s.username, hashedStudentPassword, s.name],
      });
      await db.execute({
        sql: `INSERT INTO students (id, user_id, nisn, class_id, class_name, gender, initial_password, is_active) VALUES (?, ?, ?, ?, ?, ?, 'siswa123', 1)`,
        args: [s.id, s.uid, s.nisn, s.classId, s.className, s.gender],
      });
    }
    console.log('[DB Seed] Seeded sample students (e.g. username: siswa7a, password: siswa123)');
  }

  // Seed a sample Informatika Exam for immediate CBT testing!
  const examCheck = await db.execute(`SELECT COUNT(*) as count FROM exams`);
  if (Number(examCheck.rows[0].count) === 0) {
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 60 * 30).toISOString(); // Started 30 mins ago
    const endTime = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // Valid for 24h
    const examId = 'ex_inf_7a_1';

    await db.execute({
      sql: `INSERT INTO exams (
        id, title, subject_id, subject_name, class_id, class_name, teacher_id, teacher_name,
        description, start_time, end_time, duration_minutes, kkm, token, is_token_required,
        total_questions, total_weight, shuffle_questions, shuffle_options, violation_limit, violation_action, auto_release_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        examId,
        'Ulangan Harian 1 Informatika: Perangkat Keras & Jaringan',
        'sub_inf',
        'Informatika',
        'c_7a',
        '7A',
        't_guru_inf',
        'Rina Wijaya, S.Kom.',
        'Ulangan Harian Berbasis CBT Informatika - SMPN 7 Muara Badak (KSRG). Jawablah pertanyaan dengan jujur.',
        startTime,
        endTime,
        60,
        75,
        'SPANJU7',
        1,
        5,
        100,
        0,
        0,
        3,
        'warn',
        1,
        'ongoing',
      ],
    });

    // Question 1: PG (Multiple Choice)
    const q1Id = 'q_inf_1';
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, weight, order_index) VALUES (?, ?, 'multiple_choice', ?, 20, 1)`,
      args: [q1Id, examId, 'Manakah di bawah ini yang termasuk perangkat keras masukan (input device) pada komputer/Chromebook?'],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q1_1', q1Id, 'Keyboard & Mouse', 1, 1],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q1_2', q1Id, 'Monitor & Monitor Touchscreen', 0, 2],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q1_3', q1Id, 'Printer & Speaker', 0, 3],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q1_4', q1Id, 'Proyektor LCD', 0, 4],
    });

    // Question 2: PG Kompleks (Complex Multiple Choice)
    const q2Id = 'q_inf_2';
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, weight, order_index) VALUES (?, ?, 'complex_multiple_choice', ?, 20, 2)`,
      args: [q2Id, examId, 'Pilihlah SEMUA aplikasi layanan Google Workspace for Education yang biasa digunakan dalam Pembelajaran Jarak Jauh (PJJ)! (Pilihan bisa lebih dari satu)'],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q2_1', q2Id, 'Google Classroom', 1, 1],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q2_2', q2Id, 'Google Drive', 1, 2],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q2_3', q2Id, 'Adobe Photoshop CS6', 0, 3],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q2_4', q2Id, 'Google Meet', 1, 4],
    });

    // Question 3: Benar / Salah (True or False)
    const q3Id = 'q_inf_3';
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, weight, order_index) VALUES (?, ?, 'true_false', ?, 20, 3)`,
      args: [q3Id, examId, 'Sistem Operasi ChromeOS pada Chromebook dirancang untuk bekerja secara efisien dengan berbasis cloud computing.'],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q3_1', q3Id, 'BENAR', 1, 1],
    });
    await db.execute({
      sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['opt_q3_2', q3Id, 'SALAH', 0, 2],
    });

    // Question 4: Menjodohkan (Matching)
    const q4Id = 'q_inf_4';
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, weight, order_index) VALUES (?, ?, 'matching', ?, 20, 4)`,
      args: [q4Id, examId, 'Jodohkan istilah komponen jaringan berikut dengan fungsinya yang tepat!'],
    });
    await db.execute({
      sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['pair_1', q4Id, 'Router Wireless', 'Menghubungkan jaringan lokal ke internet tanpa kabel', 1],
    });
    await db.execute({
      sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['pair_2', q4Id, 'Kabel UTP / LAN', 'Media transmisi data fisik tembaga', 2],
    });
    await db.execute({
      sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
      args: ['pair_3', q4Id, 'IP Address', 'Alamat unik perangkat dalam jaringan komputer', 3],
    });

    // Question 5: Esai (Essay)
    const q5Id = 'q_inf_5';
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, weight, order_index) VALUES (?, ?, 'essay', ?, 20, 5)`,
      args: [q5Id, examId, 'Jelaskan secara singkat keuntungan SMP Negeri 7 Muara Badak sebagai Kandidat Sekolah Rujukan Google (KSRG) dalam mendukung Pembelajaran Jarak Jauh (PJJ)!'],
    });

    console.log('[DB Seed] Seeded sample Informatika CBT exam with 5 question types (Token: SPANJU7)');
  }

  console.log('[DB Init] Database initialization complete.');
}
