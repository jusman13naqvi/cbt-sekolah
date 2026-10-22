import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { db, isTursoCloud } from './src/db/index';
import { initializeDatabase } from './src/db/init';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spanju_ksrg_secure_jwt_token_key_2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper: Auth Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'teacher' | 'student';
    fullName: string;
    classId?: string;
    className?: string;
    nisn?: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.' });
  }
};

const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk fitur ini.' });
    }
    next();
  };
};

// Log Audit Helper
async function logAudit(userId: string, username: string, role: string, action: string, details: string, ipAddress = '') {
  try {
    await db.execute({
      sql: `INSERT INTO audit_logs (id, user_id, username, role, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [`log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, userId, username, role, action, details, ipAddress],
    });
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

// ================= API ENDPOINTS =================

// 1. Server Time Synchronization
app.get('/api/time', (req, res) => {
  res.json({ serverTime: new Date().toISOString(), timestamp: Date.now() });
});

// 2. Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const result = await db.execute({
      sql: `SELECT * FROM users WHERE username = ? AND is_active = 1`,
      args: [username.trim().toLowerCase()],
    });

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Username atau password salah, atau akun nonaktif.' });
    }

    const userRow = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, String(userRow.password));

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }

    let extraDetails: any = {};
    if (userRow.role === 'student') {
      const stResult = await db.execute({
        sql: `SELECT * FROM students WHERE user_id = ?`,
        args: [userRow.id],
      });
      if (stResult.rows.length > 0) {
        extraDetails.nisn = stResult.rows[0].nisn;
        extraDetails.classId = stResult.rows[0].class_id;
        extraDetails.className = stResult.rows[0].class_name;
        extraDetails.gender = stResult.rows[0].gender;
      }
    } else if (userRow.role === 'teacher') {
      const tcResult = await db.execute({
        sql: `SELECT * FROM teachers WHERE user_id = ?`,
        args: [userRow.id],
      });
      if (tcResult.rows.length > 0) {
        extraDetails.teacherId = tcResult.rows[0].id;
        extraDetails.nip = tcResult.rows[0].nip;
      }
    }

    const tokenPayload = {
      id: userRow.id,
      username: userRow.username,
      role: userRow.role,
      fullName: userRow.full_name,
      ...extraDetails,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    await logAudit(String(userRow.id), String(userRow.username), String(userRow.role), 'LOGIN', `User ${userRow.username} berhasil login`);

    return res.json({
      message: 'Login berhasil.',
      token,
      user: tokenPayload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }

    const userId = req.user!.id;
    const userRes = await db.execute({
      sql: `SELECT password FROM users WHERE id = ?`,
      args: [userId],
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const match = await bcrypt.compare(oldPassword, String(userRes.rows[0].password));
    if (!match) {
      return res.status(400).json({ error: 'Password lama tidak sesuai.' });
    }

    const newHashed = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newHashed, userId],
    });

    await logAudit(userId, req.user!.username, req.user!.role, 'CHANGE_PASSWORD', 'Pengguna mengganti password');
    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
});

// 3. School Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.execute(`SELECT * FROM school_settings LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengaturan sekolah belum dikonfigurasi.' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      schoolName: row.school_name,
      npsn: row.npsn,
      isKsrg: Boolean(row.is_ksrg),
      logoUrl: row.logo_url,
      address: row.address,
      phone: row.phone,
      email: row.email,
      defaultViolationLimit: Number(row.default_violation_limit),
      defaultViolationAction: row.default_violation_action,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat profil sekolah.' });
  }
});

app.put('/api/settings', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolName, npsn, isKsrg, logoUrl, address, phone, email, defaultViolationLimit, defaultViolationAction } = req.body;
    await db.execute({
      sql: `UPDATE school_settings SET
        school_name = ?, npsn = ?, is_ksrg = ?, logo_url = ?, address = ?, phone = ?, email = ?,
        default_violation_limit = ?, default_violation_action = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'setting_1'`,
      args: [schoolName, npsn, isKsrg ? 1 : 0, logoUrl || '', address, phone, email, defaultViolationLimit || 3, defaultViolationAction || 'warn'],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'UPDATE_SETTINGS', 'Mengubah profil & pengaturan sekolah');
    res.json({ message: 'Pengaturan profil sekolah berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan profil sekolah.' });
  }
});

// ================= ADMIN ROUTES =================

// Admin Stats
app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [teachers, students, classes, exams, results] = await Promise.all([
      db.execute(`SELECT COUNT(*) as count FROM teachers`),
      db.execute(`SELECT COUNT(*) as count FROM students`),
      db.execute(`SELECT COUNT(*) as count FROM classes WHERE is_active = 1`),
      db.execute(`SELECT COUNT(*) as count FROM exams`),
      db.execute(`SELECT COUNT(*) as count FROM exam_participants WHERE status IN ('submitted', 'graded')`),
    ]);

    res.json({
      teacherCount: Number(teachers.rows[0].count),
      studentCount: Number(students.rows[0].count),
      classCount: Number(classes.rows[0].count),
      examCount: Number(exams.rows[0].count),
      resultCount: Number(results.rows[0].count),
      dbMode: isTursoCloud ? 'Turso Cloud LibSQL' : 'Local SQLite DB',
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat statistik admin.' });
  }
});

// Teachers Management
app.get('/api/admin/teachers', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT t.id, t.user_id, t.nip, t.email, t.phone, u.full_name, u.username, u.is_active, t.created_at
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.full_name ASC
    `);

    const teachers = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      nip: row.nip,
      fullName: row.full_name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data guru.' });
  }
});

app.post('/api/admin/teachers', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { fullName, username, password, nip, email, phone } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ error: 'Nama lengkap, username, dan password wajib diisi.' });
    }

    const check = await db.execute({
      sql: `SELECT id FROM users WHERE username = ?`,
      args: [username.trim().toLowerCase()],
    });

    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain.' });
    }

    const userId = `u_guru_${Date.now()}`;
    const teacherId = `t_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO users (id, username, password, role, full_name, is_active) VALUES (?, ?, ?, 'teacher', ?, 1)`,
      args: [userId, username.trim().toLowerCase(), hashedPassword, fullName.trim()],
    });

    await db.execute({
      sql: `INSERT INTO teachers (id, user_id, nip, email, phone) VALUES (?, ?, ?, ?, ?)`,
      args: [teacherId, userId, nip || '', email || '', phone || ''],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'CREATE_TEACHER', `Membuat akun guru: ${fullName} (${username})`);
    res.json({ message: 'Akun guru berhasil dibuat.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan data guru.' });
  }
});

app.put('/api/admin/teachers/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const teacherId = req.params.id;
    const { fullName, nip, email, phone, isActive, newPassword } = req.body;

    const tRes = await db.execute({
      sql: `SELECT user_id FROM teachers WHERE id = ?`,
      args: [teacherId],
    });

    if (tRes.rows.length === 0) {
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    const userId = String(tRes.rows[0].user_id);

    await db.execute({
      sql: `UPDATE users SET full_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [fullName, isActive ? 1 : 0, userId],
    });

    if (newPassword && newPassword.trim().length >= 6) {
      const hashed = await bcrypt.hash(newPassword.trim(), 10);
      await db.execute({
        sql: `UPDATE users SET password = ? WHERE id = ?`,
        args: [hashed, userId],
      });
    }

    await db.execute({
      sql: `UPDATE teachers SET nip = ?, email = ?, phone = ? WHERE id = ?`,
      args: [nip || '', email || '', phone || '', teacherId],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'UPDATE_TEACHER', `Memperbarui data guru ID: ${teacherId}`);
    res.json({ message: 'Data guru berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui data guru.' });
  }
});

app.delete('/api/admin/teachers/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const teacherId = req.params.id;
    const tRes = await db.execute({ sql: `SELECT user_id FROM teachers WHERE id = ?`, args: [teacherId] });
    if (tRes.rows.length > 0) {
      const userId = String(tRes.rows[0].user_id);
      await db.execute({ sql: `DELETE FROM teachers WHERE id = ?`, args: [teacherId] });
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [userId] });
    }
    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'DELETE_TEACHER', `Menghapus guru ID: ${teacherId}`);
    res.json({ message: 'Data guru berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus data guru.' });
  }
});

// Students Management & Mass Excel/CSV Import
app.get('/api/admin/students', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { classId, search } = req.query;
    let sql = `
      SELECT s.id, s.user_id, s.nisn, s.class_id, s.class_name, s.gender, s.initial_password, s.is_active, u.full_name, u.username, s.created_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (classId) {
      sql += ` AND s.class_id = ?`;
      args.push(classId);
    }

    if (search) {
      sql += ` AND (u.full_name LIKE ? OR s.nisn LIKE ? OR u.username LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY s.class_name ASC, u.full_name ASC`;

    const result = await db.execute({ sql, args });
    const students = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      nisn: row.nisn,
      classId: row.class_id,
      className: row.class_name,
      gender: row.gender,
      fullName: row.full_name,
      username: row.username,
      initialPassword: row.initial_password,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data siswa.' });
  }
});

app.post('/api/admin/students', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { fullName, username, password, nisn, classId, className, gender } = req.body;
    if (!fullName || !username || !password || !classId) {
      return res.status(400).json({ error: 'Nama, username, password, dan kelas wajib diisi.' });
    }

    const check = await db.execute({ sql: `SELECT id FROM users WHERE username = ?`, args: [username.trim().toLowerCase()] });
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Username sudah digunakan.' });
    }

    const userId = `u_sis_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const studentId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO users (id, username, password, role, full_name, is_active) VALUES (?, ?, ?, 'student', ?, 1)`,
      args: [userId, username.trim().toLowerCase(), hashedPassword, fullName.trim()],
    });

    await db.execute({
      sql: `INSERT INTO students (id, user_id, nisn, class_id, class_name, gender, initial_password, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [studentId, userId, nisn || '', classId, className || '7A', gender || 'L', password],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'CREATE_STUDENT', `Tambah siswa: ${fullName} (${username})`);
    res.json({ message: 'Siswa berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan siswa.' });
  }
});

app.put('/api/admin/students/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const studentId = req.params.id;
    const { fullName, nisn, classId, className, gender, isActive, resetPassword } = req.body;

    const sRes = await db.execute({ sql: `SELECT user_id FROM students WHERE id = ?`, args: [studentId] });
    if (sRes.rows.length === 0) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    const userId = String(sRes.rows[0].user_id);

    await db.execute({
      sql: `UPDATE users SET full_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [fullName, isActive ? 1 : 0, userId],
    });

    if (resetPassword && resetPassword.trim().length >= 6) {
      const hashed = await bcrypt.hash(resetPassword.trim(), 10);
      await db.execute({ sql: `UPDATE users SET password = ? WHERE id = ?`, args: [hashed, userId] });
      await db.execute({ sql: `UPDATE students SET initial_password = ? WHERE id = ?`, args: [resetPassword.trim(), studentId] });
    }

    await db.execute({
      sql: `UPDATE students SET nisn = ?, class_id = ?, class_name = ?, gender = ? WHERE id = ?`,
      args: [nisn || '', classId, className, gender || 'L', studentId],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'UPDATE_STUDENT', `Update siswa ID: ${studentId}`);
    res.json({ message: 'Data siswa berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui data siswa.' });
  }
});

app.delete('/api/admin/students/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const studentId = req.params.id;
    const sRes = await db.execute({ sql: `SELECT user_id FROM students WHERE id = ?`, args: [studentId] });
    if (sRes.rows.length > 0) {
      const userId = String(sRes.rows[0].user_id);
      await db.execute({ sql: `DELETE FROM students WHERE id = ?`, args: [studentId] });
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [userId] });
    }
    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'DELETE_STUDENT', `Hapus siswa ID: ${studentId}`);
    res.json({ message: 'Siswa berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus siswa.' });
  }
});

app.post('/api/admin/students/batch-delete', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu siswa untuk dihapus.' });
    }

    let deletedCount = 0;
    for (const sid of studentIds) {
      const sRes = await db.execute({ sql: `SELECT user_id FROM students WHERE id = ?`, args: [sid] });
      if (sRes.rows.length > 0) {
        const userId = String(sRes.rows[0].user_id);
        await db.execute({ sql: `DELETE FROM students WHERE id = ?`, args: [sid] });
        await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [userId] });
        deletedCount++;
      }
    }

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'BATCH_DELETE_STUDENTS', `Menghapus massal ${deletedCount} siswa`);
    res.json({ message: `Berhasil menghapus ${deletedCount} data siswa.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus massal data siswa.' });
  }
});

// Mass Student Import API
app.post('/api/admin/students/import', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { studentData } = req.body; // Array of { nisn, fullName, username, className, gender, password }
    if (!Array.isArray(studentData) || studentData.length === 0) {
      return res.status(400).json({ error: 'Data siswa tidak boleh kosong.' });
    }

    // Get active classes for mapping class name -> class_id
    const classesRes = await db.execute(`SELECT id, name FROM classes`);
    const classMap: Record<string, string> = {};
    classesRes.rows.forEach((r) => {
      classMap[String(r.name).toUpperCase().trim()] = String(r.id);
    });

    // Get existing usernames and NISNs
    const existingUsersRes = await db.execute(`SELECT username FROM users`);
    const existingUsernames = new Set(existingUsersRes.rows.map((r) => String(r.username).toLowerCase()));

    const existingNisnRes = await db.execute(`SELECT nisn FROM students WHERE nisn != ''`);
    const existingNisns = new Set(existingNisnRes.rows.map((r) => String(r.nisn)));

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < studentData.length; index++) {
      const rowNum = index + 1;
      const item = studentData[index];
      const fullName = (item.fullName || item['Nama Lengkap'] || '').trim();
      const username = (item.username || item['Username'] || '').trim().toLowerCase();
      const nisn = (item.nisn || item['NISN'] || '').trim();
      const className = (item.className || item['Kelas'] || '').trim().toUpperCase();
      const gender = (item.gender || item['Jenis Kelamin'] || 'L').trim().toUpperCase().startsWith('P') ? 'P' : 'L';
      const rawPassword = (item.password || item['Password'] || 'spanju123').trim();

      if (!fullName || !username) {
        failedCount++;
        errors.push({ row: rowNum, reason: `Baris ${rowNum}: Nama Lengkap dan Username wajib diisi.` });
        continue;
      }

      const classId = classMap[className];
      if (!classId) {
        failedCount++;
        errors.push({ row: rowNum, reason: `Baris ${rowNum}: Kelas "${className}" tidak ditemukan dalam sistem.` });
        continue;
      }

      if (existingUsernames.has(username)) {
        skippedCount++;
        errors.push({ row: rowNum, reason: `Baris ${rowNum}: Username "${username}" sudah ada (dilewati).` });
        continue;
      }

      if (nisn && existingNisns.has(nisn)) {
        skippedCount++;
        errors.push({ row: rowNum, reason: `Baris ${rowNum}: NISN "${nisn}" sudah terdaftar (dilewati).` });
        continue;
      }

      const userId = `u_sis_imp_${Date.now()}_${rowNum}_${Math.random().toString(36).substr(2, 4)}`;
      const studentId = `s_imp_${Date.now()}_${rowNum}_${Math.random().toString(36).substr(2, 4)}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      await db.execute({
        sql: `INSERT INTO users (id, username, password, role, full_name, is_active) VALUES (?, ?, ?, 'student', ?, 1)`,
        args: [userId, username, hashedPassword, fullName],
      });

      await db.execute({
        sql: `INSERT INTO students (id, user_id, nisn, class_id, class_name, gender, initial_password, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [studentId, userId, nisn, classId, className, gender, rawPassword],
      });

      existingUsernames.add(username);
      if (nisn) existingNisns.add(nisn);
      successCount++;
    }

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'IMPORT_STUDENTS', `Impor siswa massal: ${successCount} berhasil, ${skippedCount} dilewati, ${failedCount} gagal`);

    res.json({
      message: `Proses impor selesai: ${successCount} berhasil, ${skippedCount} dilewati, ${failedCount} gagal.`,
      successCount,
      skippedCount,
      failedCount,
      errors,
    });
  } catch (err: any) {
    console.error('Import Error:', err);
    res.status(500).json({ error: 'Gagal memproses impor siswa.' });
  }
});

// Classes Management
app.get('/api/admin/classes', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      ORDER BY c.grade_level ASC, c.name ASC
    `);

    const classes = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      gradeLevel: Number(row.grade_level),
      homeroomTeacher: row.homeroom_teacher,
      isActive: Boolean(row.is_active),
      studentCount: Number(row.student_count),
      createdAt: row.created_at,
    }));

    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data kelas.' });
  }
});

app.post('/api/admin/classes', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, gradeLevel, homeroomTeacher } = req.body;
    if (!name || !gradeLevel) {
      return res.status(400).json({ error: 'Nama kelas dan tingkat kelas wajib diisi.' });
    }

    const check = await db.execute({ sql: `SELECT id FROM classes WHERE name = ?`, args: [name.trim().toUpperCase()] });
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Nama kelas sudah ada.' });
    }

    const classId = `c_${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO classes (id, name, grade_level, homeroom_teacher, is_active) VALUES (?, ?, ?, ?, 1)`,
      args: [classId, name.trim().toUpperCase(), Number(gradeLevel), homeroomTeacher || ''],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'CREATE_CLASS', `Tambah kelas: ${name}`);
    res.json({ message: 'Kelas berhasil dibuat.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat kelas baru.' });
  }
});

app.put('/api/admin/classes/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const classId = req.params.id;
    const { name, gradeLevel, homeroomTeacher, isActive } = req.body;

    await db.execute({
      sql: `UPDATE classes SET name = ?, grade_level = ?, homeroom_teacher = ?, is_active = ? WHERE id = ?`,
      args: [name.trim().toUpperCase(), Number(gradeLevel), homeroomTeacher || '', isActive ? 1 : 0, classId],
    });

    res.json({ message: 'Data kelas berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui kelas.' });
  }
});

app.delete('/api/admin/classes/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const classId = req.params.id;
    const stCheck = await db.execute({ sql: `SELECT COUNT(*) as count FROM students WHERE class_id = ?`, args: [classId] });
    if (Number(stCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Kelas tidak dapat dihapus karena masih memiliki siswa terdaftar.' });
    }

    await db.execute({ sql: `DELETE FROM classes WHERE id = ?`, args: [classId] });
    res.json({ message: 'Kelas berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus kelas.' });
  }
});

// Audit Logs
app.get('/api/admin/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.execute(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200`);
    const logs = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      role: row.role,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      timestamp: row.timestamp,
    }));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat log aktivitas.' });
  }
});

// Backup Database (Export JSON)
app.get('/api/admin/backup', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const [settings, users, teachers, students, classes, subjects, exams, questions, questionOptions, matchingPairs, participants, answers, violations, logs] = await Promise.all([
      db.execute(`SELECT * FROM school_settings`),
      db.execute(`SELECT id, username, role, full_name, is_active, created_at FROM users`), // Exclude sensitive hashes for safety
      db.execute(`SELECT * FROM teachers`),
      db.execute(`SELECT * FROM students`),
      db.execute(`SELECT * FROM classes`),
      db.execute(`SELECT * FROM subjects`),
      db.execute(`SELECT * FROM exams`),
      db.execute(`SELECT * FROM questions`),
      db.execute(`SELECT * FROM question_options`),
      db.execute(`SELECT * FROM matching_pairs`),
      db.execute(`SELECT * FROM exam_participants`),
      db.execute(`SELECT * FROM answers`),
      db.execute(`SELECT * FROM exam_violations`),
      db.execute(`SELECT * FROM audit_logs LIMIT 1000`),
    ]);

    const backupPayload = {
      app: 'PJJ_SPANJU_CBT',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schoolSettings: settings.rows,
      users: users.rows,
      teachers: teachers.rows,
      students: students.rows,
      classes: classes.rows,
      subjects: subjects.rows,
      exams: exams.rows,
      questions: questions.rows,
      questionOptions: questionOptions.rows,
      matchingPairs: matchingPairs.rows,
      examParticipants: participants.rows,
      answers: answers.rows,
      examViolations: violations.rows,
      auditLogs: logs.rows,
    };

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'DATABASE_BACKUP', 'Mengunduh file backup JSON sistem');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_spanju_${Date.now()}.json`);
    res.json(backupPayload);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat backup database.' });
  }
});

// Restore Database
app.post('/api/admin/restore', authenticateToken, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const backupData = req.body;
    if (!backupData || backupData.app !== 'PJJ_SPANJU_CBT') {
      return res.status(400).json({ error: 'Format file backup tidak valid untuk PJJ SPANJU CBT.' });
    }

    // Perform atomic transaction if possible
    let restoredCount = 0;

    if (Array.isArray(backupData.schoolSettings) && backupData.schoolSettings.length > 0) {
      const s = backupData.schoolSettings[0];
      await db.execute({
        sql: `UPDATE school_settings SET school_name = ?, npsn = ?, address = ?, phone = ?, email = ? WHERE id = 'setting_1'`,
        args: [s.school_name, s.npsn, s.address, s.phone, s.email],
      });
    }

    if (Array.isArray(backupData.classes)) {
      for (const c of backupData.classes) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO classes (id, name, grade_level, homeroom_teacher, is_active) VALUES (?, ?, ?, ?, ?)`,
          args: [c.id, c.name, c.grade_level, c.homeroom_teacher, c.is_active],
        });
        restoredCount++;
      }
    }

    if (Array.isArray(backupData.subjects)) {
      for (const s of backupData.subjects) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO subjects (id, name, code, is_active) VALUES (?, ?, ?, ?)`,
          args: [s.id, s.name, s.code, s.is_active],
        });
        restoredCount++;
      }
    }

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'DATABASE_RESTORE', `Memulihkan data dari backup JSON (${restoredCount} entitas dipulihkan)`);
    res.json({ message: 'Proses pemulihan data berhasil dilakukan.', restoredCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memulihkan data dari file backup.' });
  }
});

// Database Health Check
app.get('/api/admin/db-health', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const startTime = Date.now();
    await db.execute(`SELECT 1`);
    const latencyMs = Date.now() - startTime;
    res.json({
      status: 'Healthy',
      connectionType: isTursoCloud ? 'Turso Cloud LibSQL' : 'Local SQLite File Database',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'Unhealthy', error: err.message });
  }
});

// ================= TEACHER ROUTES =================

// Subjects
app.get('/api/teacher/subjects', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute(`SELECT * FROM subjects WHERE is_active = 1 ORDER BY name ASC`);
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        isActive: Boolean(r.is_active),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat mata pelajaran.' });
  }
});

app.post('/api/teacher/subjects', authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Nama dan kode mata pelajaran wajib diisi.' });
    }
    const id = `sub_${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO subjects (id, name, code, is_active) VALUES (?, ?, ?, 1)`,
      args: [id, name, code.toUpperCase()],
    });
    res.json({ message: 'Mata pelajaran berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan mata pelajaran.' });
  }
});

app.put('/api/teacher/subjects/:id', authenticateToken, requireRole('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const subjectId = req.params.id;
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Nama dan kode mata pelajaran wajib diisi.' });
    }
    await db.execute({
      sql: `UPDATE subjects SET name = ?, code = ? WHERE id = ?`,
      args: [name.trim(), code.trim().toUpperCase(), subjectId],
    });
    res.json({ message: 'Mata pelajaran berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui mata pelajaran.' });
  }
});

app.delete('/api/teacher/subjects/:id', authenticateToken, requireRole('admin', 'teacher'), async (req: AuthRequest, res) => {
  try {
    const subjectId = req.params.id;
    await db.execute({
      sql: `DELETE FROM subjects WHERE id = ?`,
      args: [subjectId],
    });
    res.json({ message: 'Mata pelajaran berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus mata pelajaran.' });
  }
});

// Exams CRUD
app.get('/api/teacher/exams', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    let sql = `SELECT * FROM exams ORDER BY start_time DESC`;
    const result = await db.execute(sql);

    const exams = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      classId: row.class_id,
      className: row.class_name,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: Number(row.duration_minutes),
      kkm: Number(row.kkm),
      token: row.token,
      isTokenRequired: Boolean(row.is_token_required),
      totalQuestions: Number(row.total_questions),
      totalWeight: Number(row.total_weight),
      shuffleQuestions: Boolean(row.shuffle_questions),
      shuffleOptions: Boolean(row.shuffle_options),
      violationLimit: Number(row.violation_limit),
      violationAction: row.violation_action,
      autoReleaseScore: Boolean(row.auto_release_score),
      status: row.status,
      createdAt: row.created_at,
    }));

    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat daftar ujian.' });
  }
});

app.get('/api/teacher/exams/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const examRes = await db.execute({ sql: `SELECT * FROM exams WHERE id = ?`, args: [examId] });
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ujian tidak ditemukan.' });
    }

    const row = examRes.rows[0];

    // Load questions
    const qRes = await db.execute({
      sql: `SELECT * FROM questions WHERE exam_id = ? ORDER BY order_index ASC`,
      args: [examId],
    });

    const questions: any[] = [];
    for (const q of qRes.rows) {
      const qObj: any = {
        id: q.id,
        examId: q.exam_id,
        questionType: q.question_type,
        questionText: q.question_text,
        imageUrl: q.image_url,
        weight: Number(q.weight),
        orderIndex: Number(q.order_index),
        options: [],
        matchingPairs: [],
      };

      if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(String(q.question_type))) {
        const optRes = await db.execute({
          sql: `SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index ASC`,
          args: [q.id],
        });
        qObj.options = optRes.rows.map((o) => ({
          id: o.id,
          questionId: o.question_id,
          optionText: o.option_text,
          isCorrect: Boolean(o.is_correct),
          imageUrl: o.image_url,
          orderIndex: Number(o.order_index),
        }));
      } else if (q.question_type === 'matching') {
        const pairRes = await db.execute({
          sql: `SELECT * FROM matching_pairs WHERE question_id = ? ORDER BY order_index ASC`,
          args: [q.id],
        });
        qObj.matchingPairs = pairRes.rows.map((p) => ({
          id: p.id,
          questionId: p.question_id,
          leftText: p.left_text,
          rightText: p.right_text,
          orderIndex: Number(p.order_index),
        }));
      }

      questions.push(qObj);
    }

    res.json({
      id: row.id,
      title: row.title,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      classId: row.class_id,
      className: row.class_name,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: Number(row.duration_minutes),
      kkm: Number(row.kkm),
      token: row.token,
      isTokenRequired: Boolean(row.is_token_required),
      totalQuestions: Number(row.total_questions),
      totalWeight: Number(row.total_weight),
      shuffleQuestions: Boolean(row.shuffle_questions),
      shuffleOptions: Boolean(row.shuffle_options),
      violationLimit: Number(row.violation_limit),
      violationAction: row.violation_action,
      autoReleaseScore: Boolean(row.auto_release_score),
      status: row.status,
      questions,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat detail ujian.' });
  }
});

app.post('/api/teacher/exams', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      title, subjectId, subjectName, classId, className, description,
      startTime, endTime, durationMinutes, kkm, token, isTokenRequired,
      shuffleQuestions, shuffleOptions, violationLimit, violationAction, autoReleaseScore, status
    } = req.body;

    if (!title || !subjectId || !classId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Judul, Mata Pelajaran, Kelas, dan Waktu Ujian wajib diisi.' });
    }

    const examId = `ex_${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO exams (
        id, title, subject_id, subject_name, class_id, class_name, teacher_id, teacher_name,
        description, start_time, end_time, duration_minutes, kkm, token, is_token_required,
        total_questions, total_weight, shuffle_questions, shuffle_options, violation_limit, violation_action, auto_release_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 100, ?, ?, ?, ?, ?, ?)`,
      args: [
        examId, title, subjectId, subjectName || 'Mata Pelajaran', classId, className || '7A',
        req.user!.id, req.user!.fullName, description || '', startTime, endTime,
        Number(durationMinutes) || 60, Number(kkm) || 75, token || 'SPANJU7', isTokenRequired ? 1 : 0,
        shuffleQuestions ? 1 : 0, shuffleOptions ? 1 : 0, Number(violationLimit) || 3,
        violationAction || 'warn', autoReleaseScore ? 1 : 0, status || 'scheduled'
      ],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'CREATE_EXAM', `Membuat ujian baru: ${title}`);
    res.json({ message: 'Ujian berhasil dibuat.', examId });
  } catch (err) {
    console.error('Create exam error:', err);
    res.status(500).json({ error: 'Gagal membuat ujian baru.' });
  }
});

app.put('/api/teacher/exams/:id', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const {
      title, subjectId, subjectName, classId, className, description,
      startTime, endTime, durationMinutes, kkm, token, isTokenRequired,
      shuffleQuestions, shuffleOptions, violationLimit, violationAction, autoReleaseScore, status
    } = req.body;

    await db.execute({
      sql: `UPDATE exams SET
        title = ?, subject_id = ?, subject_name = ?, class_id = ?, class_name = ?, description = ?,
        start_time = ?, end_time = ?, duration_minutes = ?, kkm = ?, token = ?, is_token_required = ?,
        shuffle_questions = ?, shuffle_options = ?, violation_limit = ?, violation_action = ?,
        auto_release_score = ?, status = ?
        WHERE id = ?`,
      args: [
        title, subjectId, subjectName, classId, className, description || '',
        startTime, endTime, Number(durationMinutes), Number(kkm), token || '', isTokenRequired ? 1 : 0,
        shuffleQuestions ? 1 : 0, shuffleOptions ? 1 : 0, Number(violationLimit), violationAction,
        autoReleaseScore ? 1 : 0, status, examId
      ],
    });

    res.json({ message: 'Pengaturan ujian berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui ujian.' });
  }
});

app.delete('/api/teacher/exams/:id', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    await db.execute({ sql: `DELETE FROM exams WHERE id = ?`, args: [examId] });
    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'DELETE_EXAM', `Menghapus ujian ID: ${examId}`);
    res.json({ message: 'Ujian berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus ujian.' });
  }
});

app.post('/api/teacher/exams/:id/duplicate', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const originalRes = await db.execute({ sql: `SELECT * FROM exams WHERE id = ?`, args: [examId] });
    if (originalRes.rows.length === 0) return res.status(404).json({ error: 'Ujian awal tidak ditemukan.' });

    const o = originalRes.rows[0];
    const newExamId = `ex_copy_${Date.now()}`;
    const newTitle = `[Salinan] ${o.title}`;

    await db.execute({
      sql: `INSERT INTO exams (
        id, title, subject_id, subject_name, class_id, class_name, teacher_id, teacher_name,
        description, start_time, end_time, duration_minutes, kkm, token, is_token_required,
        total_questions, total_weight, shuffle_questions, shuffle_options, violation_limit, violation_action, auto_release_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      args: [
        newExamId, newTitle, o.subject_id, o.subject_name, o.class_id, o.class_name,
        req.user!.id, req.user!.fullName, o.description, o.start_time, o.end_time,
        o.duration_minutes, o.kkm, o.token, o.is_token_required, o.total_questions, o.total_weight,
        o.shuffle_questions, o.shuffle_options, o.violation_limit, o.violation_action, o.auto_release_score
      ],
    });

    // Copy questions
    const questionsRes = await db.execute({ sql: `SELECT * FROM questions WHERE exam_id = ?`, args: [examId] });
    for (const q of questionsRes.rows) {
      const newQId = `q_copy_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await db.execute({
        sql: `INSERT INTO questions (id, exam_id, question_type, question_text, image_url, weight, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newQId, newExamId, q.question_type, q.question_text, q.image_url, q.weight, q.order_index],
      });

      if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(String(q.question_type))) {
        const optRes = await db.execute({ sql: `SELECT * FROM question_options WHERE question_id = ?`, args: [q.id] });
        for (const opt of optRes.rows) {
          await db.execute({
            sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
            args: [`opt_copy_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, newQId, opt.option_text, opt.is_correct, opt.image_url, opt.order_index],
          });
        }
      } else if (q.question_type === 'matching') {
        const pairRes = await db.execute({ sql: `SELECT * FROM matching_pairs WHERE question_id = ?`, args: [q.id] });
        for (const pair of pairRes.rows) {
          await db.execute({
            sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
            args: [`pair_copy_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, newQId, pair.left_text, pair.right_text, pair.order_index],
          });
        }
      }
    }

    res.json({ message: 'Ujian berhasil disalin.', newExamId });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyalin ujian.' });
  }
});

// Questions Bank Management (5 Question Types)
app.post('/api/teacher/exams/:id/questions', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const { questionType, questionText, imageUrl, weight, options, matchingPairs } = req.body;

    if (!questionType || !questionText) {
      return res.status(400).json({ error: 'Tipe soal dan teks soal wajib diisi.' });
    }

    // Get order index
    const countRes = await db.execute({ sql: `SELECT COUNT(*) as count FROM questions WHERE exam_id = ?`, args: [examId] });
    const orderIndex = Number(countRes.rows[0].count) + 1;

    const qId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    await db.execute({
      sql: `INSERT INTO questions (id, exam_id, question_type, question_text, image_url, weight, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [qId, examId, questionType, questionText, imageUrl || '', Number(weight) || 1, orderIndex],
    });

    if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(questionType) && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await db.execute({
          sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [`opt_${Date.now()}_${i}`, qId, opt.optionText, opt.isCorrect ? 1 : 0, opt.imageUrl || '', i + 1],
        });
      }
    } else if (questionType === 'matching' && Array.isArray(matchingPairs)) {
      for (let i = 0; i < matchingPairs.length; i++) {
        const pair = matchingPairs[i];
        await db.execute({
          sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
          args: [`pair_${Date.now()}_${i}`, qId, pair.leftText, pair.rightText, i + 1],
        });
      }
    }

    // Update total questions count in exam
    const totalQRes = await db.execute({ sql: `SELECT COUNT(*) as count FROM questions WHERE exam_id = ?`, args: [examId] });
    await db.execute({ sql: `UPDATE exams SET total_questions = ? WHERE id = ?`, args: [Number(totalQRes.rows[0].count), examId] });

    res.json({ message: 'Soal berhasil ditambahkan.', questionId: qId });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan soal.' });
  }
});

app.put('/api/teacher/questions/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const qId = req.params.id;
    const { questionType, questionText, imageUrl, weight, options, matchingPairs } = req.body;

    await db.execute({
      sql: `UPDATE questions SET question_type = ?, question_text = ?, image_url = ?, weight = ? WHERE id = ?`,
      args: [questionType, questionText, imageUrl || '', Number(weight) || 1, qId],
    });

    // Clear old options / pairs and re-insert
    await db.execute({ sql: `DELETE FROM question_options WHERE question_id = ?`, args: [qId] });
    await db.execute({ sql: `DELETE FROM matching_pairs WHERE question_id = ?`, args: [qId] });

    if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(questionType) && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await db.execute({
          sql: `INSERT INTO question_options (id, question_id, option_text, is_correct, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [`opt_${Date.now()}_${i}`, qId, opt.optionText, opt.isCorrect ? 1 : 0, opt.imageUrl || '', i + 1],
        });
      }
    } else if (questionType === 'matching' && Array.isArray(matchingPairs)) {
      for (let i = 0; i < matchingPairs.length; i++) {
        const pair = matchingPairs[i];
        await db.execute({
          sql: `INSERT INTO matching_pairs (id, question_id, left_text, right_text, order_index) VALUES (?, ?, ?, ?, ?)`,
          args: [`pair_${Date.now()}_${i}`, qId, pair.leftText, pair.rightText, i + 1],
        });
      }
    }

    res.json({ message: 'Soal berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui soal.' });
  }
});

app.delete('/api/teacher/questions/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const qId = req.params.id;
    const qRes = await db.execute({ sql: `SELECT exam_id FROM questions WHERE id = ?`, args: [qId] });
    if (qRes.rows.length > 0) {
      const examId = String(qRes.rows[0].exam_id);
      await db.execute({ sql: `DELETE FROM questions WHERE id = ?`, args: [qId] });

      const totalQRes = await db.execute({ sql: `SELECT COUNT(*) as count FROM questions WHERE exam_id = ?`, args: [examId] });
      await db.execute({ sql: `UPDATE exams SET total_questions = ? WHERE id = ?`, args: [Number(totalQRes.rows[0].count), examId] });
    }
    res.json({ message: 'Soal berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus soal.' });
  }
});

// Live Participant Monitoring & Violation Inspection
app.get('/api/teacher/exams/:id/participants', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const result = await db.execute({
      sql: `SELECT * FROM exam_participants WHERE exam_id = ? ORDER BY student_name ASC`,
      args: [examId],
    });

    const participants = result.rows.map((r) => ({
      id: r.id,
      examId: r.exam_id,
      studentId: r.student_id,
      studentName: r.student_name,
      studentNisn: r.student_nisn,
      className: r.class_name,
      status: r.status,
      startTime: r.start_time,
      submitTime: r.submit_time,
      score: Number(r.score),
      isPassed: Boolean(r.is_passed),
      essayGradedCount: Number(r.essay_graded_count),
      totalEssayCount: Number(r.total_essay_count),
      violationCount: Number(r.violation_count),
      cameraActive: Boolean(r.camera_active),
      createdAt: r.created_at,
    }));

    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat status peserta ujian.' });
  }
});

// Reset Student Exam Session (Remedial)
app.post('/api/teacher/participants/:id/reset-exam', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const participantId = req.params.id;
    await db.execute({ sql: `DELETE FROM answers WHERE participant_id = ?`, args: [participantId] });
    await db.execute({ sql: `DELETE FROM exam_violations WHERE participant_id = ?`, args: [participantId] });

    await db.execute({
      sql: `UPDATE exam_participants SET 
            status = 'not_started', score = 0, is_passed = 0, violation_count = 0,
            essay_graded_count = 0, total_essay_count = 0, start_time = NULL, submit_time = NULL,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [participantId],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'RESET_STUDENT_EXAM', `Mereset ujian peserta ID: ${participantId} untuk remidial`);
    res.json({ message: 'Sesi ujian siswa berhasil direset. Siswa dapat mengerjakan ulang.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mereset ujian siswa.' });
  }
});

// Reset Student Violations (Unlock / Clear Violations)
app.post('/api/teacher/participants/:id/reset-violations', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const participantId = req.params.id;
    await db.execute({ sql: `DELETE FROM exam_violations WHERE participant_id = ?`, args: [participantId] });

    const pRes = await db.execute({ sql: `SELECT status FROM exam_participants WHERE id = ?`, args: [participantId] });
    let newStatus = pRes.rows.length > 0 ? String(pRes.rows[0].status) : 'in_progress';
    if (newStatus === 'locked') {
      newStatus = 'in_progress';
    }

    await db.execute({
      sql: `UPDATE exam_participants SET violation_count = 0, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newStatus, participantId],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'RESET_STUDENT_VIOLATIONS', `Mereset pelanggaran peserta ID: ${participantId}`);
    res.json({ message: 'Catatan pelanggaran siswa berhasil dibersihkan & pengerjaan dibuka kembali.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mereset pelanggaran siswa.' });
  }
});

// Essay Manual Grading Routes
app.get('/api/teacher/exams/:id/essay-answers', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const examId = req.params.id;

    // Get all essay questions for this exam
    const qRes = await db.execute({
      sql: `SELECT id, question_text, weight FROM questions WHERE exam_id = ? AND question_type = 'essay'`,
      args: [examId],
    });

    if (qRes.rows.length === 0) {
      return res.json([]);
    }

    const essayQuestions = qRes.rows;
    const essayQIds = essayQuestions.map((q) => String(q.id));

    // Get answers
    const placeholders = essayQIds.map(() => '?').join(',');
    const ansRes = await db.execute({
      sql: `SELECT a.*, ep.student_name, ep.student_nisn, ep.class_name
            FROM answers a
            JOIN exam_participants ep ON a.participant_id = ep.id
            WHERE ep.exam_id = ? AND a.question_id IN (${placeholders})
            ORDER BY ep.student_name ASC`,
      args: [examId, ...essayQIds],
    });

    const items = ansRes.rows.map((row) => ({
      answerId: row.id,
      participantId: row.participant_id,
      studentName: row.student_name,
      studentNisn: row.student_nisn,
      className: row.class_name,
      questionId: row.question_id,
      answerText: row.answer_json ? JSON.parse(String(row.answer_json)) : '',
      scoreObtained: Number(row.score_obtained),
      isGraded: Boolean(row.is_graded),
      teacherNotes: row.teacher_notes || '',
      updatedAt: row.updated_at,
    }));

    res.json({ essayQuestions, studentAnswers: items });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat lembar esai.' });
  }
});

app.post('/api/teacher/answers/:answerId/grade', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const answerId = req.params.answerId;
    const { scoreObtained, teacherNotes } = req.body;

    const ansRes = await db.execute({ sql: `SELECT participant_id, question_id FROM answers WHERE id = ?`, args: [answerId] });
    if (ansRes.rows.length === 0) return res.status(404).json({ error: 'Jawaban tidak ditemukan.' });

    const participantId = String(ansRes.rows[0].participant_id);

    await db.execute({
      sql: `UPDATE answers SET score_obtained = ?, is_graded = 1, graded_at = CURRENT_TIMESTAMP, graded_by = ?, teacher_notes = ? WHERE id = ?`,
      args: [Number(scoreObtained), req.user!.fullName, teacherNotes || '', answerId],
    });

    // Recalculate participant's overall score
    const allAnsRes = await db.execute({ sql: `SELECT score_obtained FROM answers WHERE participant_id = ?`, args: [participantId] });
    const rawTotal = allAnsRes.rows.reduce((sum, r) => sum + Number(r.score_obtained), 0);
    const totalScoreObtained = Math.round(rawTotal * 100) / 100;

    // Get exam kkm and total questions weight
    const pRes = await db.execute({ sql: `SELECT exam_id FROM exam_participants WHERE id = ?`, args: [participantId] });
    const examId = String(pRes.rows[0].exam_id);
    const examRes = await db.execute({ sql: `SELECT kkm FROM exams WHERE id = ?`, args: [examId] });
    const kkm = Number(examRes.rows[0].kkm);

    const isPassed = totalScoreObtained >= kkm;

    // Check graded count
    const essayCountRes = await db.execute({
      sql: `SELECT COUNT(*) as total, SUM(CASE WHEN a.is_graded = 1 THEN 1 ELSE 0 END) as graded
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            WHERE a.participant_id = ? AND q.question_type = 'essay'`,
      args: [participantId],
    });

    const totalEssay = Number(essayCountRes.rows[0].total || 0);
    const gradedEssay = Number(essayCountRes.rows[0].graded || 0);
    const status = totalEssay > 0 && gradedEssay < totalEssay ? 'in_progress' : 'graded';

    await db.execute({
      sql: `UPDATE exam_participants SET score = ?, is_passed = ?, status = ?, essay_graded_count = ?, total_essay_count = ? WHERE id = ?`,
      args: [totalScoreObtained, isPassed ? 1 : 0, status, gradedEssay, totalEssay, participantId],
    });

    res.json({ message: 'Nilai esai berhasil disimpan.', totalScoreObtained, isPassed });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menilai jawaban esai.' });
  }
});

// Score Release
app.post('/api/teacher/exams/:id/release-scores', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const { autoReleaseScore } = req.body;

    await db.execute({
      sql: `UPDATE exams SET auto_release_score = ? WHERE id = ?`,
      args: [autoReleaseScore ? 1 : 0, examId],
    });

    await logAudit(req.user!.id, req.user!.username, req.user!.role, 'RELEASE_SCORES', `Mengubah publikasi nilai untuk ujian ID: ${examId} (Status: ${autoReleaseScore ? 'Dirilis' : 'Ditahan'})`);
    res.json({ message: `Status nilai berhasil diubah ke: ${autoReleaseScore ? 'Dirilis' : 'Ditahan'}.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal merilis nilai.' });
  }
});

// ================= STUDENT CBT ROUTES =================

// Student Exams List
app.get('/api/student/exams', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const studentClassId = req.user!.classId;
    const studentClassName = req.user!.className;

    let sql = `SELECT * FROM exams WHERE (class_id = ? OR class_name = ?) AND status != 'draft' ORDER BY start_time DESC`;
    const examResult = await db.execute({ sql, args: [studentClassId || '', studentClassName || '7A'] });

    const studentId = req.user!.id;
    const exams = [];

    for (const r of examResult.rows) {
      // Check participant status
      const partRes = await db.execute({
        sql: `SELECT * FROM exam_participants WHERE exam_id = ? AND student_id = ?`,
        args: [r.id, studentId],
      });

      let myStatus = 'not_started';
      let myScore = null;
      let isPassed = false;

      if (partRes.rows.length > 0) {
        const p = partRes.rows[0];
        myStatus = String(p.status);
        myScore = Number(p.score);
        isPassed = Boolean(p.is_passed);
      }

      exams.push({
        id: r.id,
        title: r.title,
        subjectName: r.subject_name,
        className: r.class_name,
        teacherName: r.teacher_name,
        description: r.description,
        startTime: r.start_time,
        endTime: r.end_time,
        durationMinutes: Number(r.duration_minutes),
        kkm: Number(r.kkm),
        isTokenRequired: Boolean(r.is_token_required),
        totalQuestions: Number(r.total_questions),
        violationLimit: Number(r.violation_limit),
        autoReleaseScore: Boolean(r.auto_release_score),
        myStatus,
        myScore,
        isPassed,
      });
    }

    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat daftar ujian siswa.' });
  }
});

// Start / Resume CBT Session
app.post('/api/student/exams/:id/start', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const { tokenInput } = req.body;
    const studentId = req.user!.id;

    const examRes = await db.execute({ sql: `SELECT * FROM exams WHERE id = ?`, args: [examId] });
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Ujian tidak ditemukan.' });

    const exam = examRes.rows[0];

    // Verify token if required
    if (exam.is_token_required) {
      if (!tokenInput || String(tokenInput).trim().toUpperCase() !== String(exam.token).trim().toUpperCase()) {
        return res.status(400).json({ error: 'Token ujian salah. Silakan minta token resmi kepada guru pengawas.' });
      }
    }

    // Check or create participant record
    let partRes = await db.execute({
      sql: `SELECT * FROM exam_participants WHERE exam_id = ? AND student_id = ?`,
      args: [examId, studentId],
    });

    let participantId = '';
    let startTime = new Date().toISOString();

    if (partRes.rows.length === 0) {
      participantId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await db.execute({
        sql: `INSERT INTO exam_participants (
          id, exam_id, student_id, student_name, student_nisn, class_name, status, start_time, violation_count, camera_active
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, 0, 0)`,
        args: [
          participantId, examId, studentId, req.user!.fullName, req.user!.nisn || '', req.user!.className || '7A', startTime
        ],
      });
    } else {
      const p = partRes.rows[0];
      if (['submitted', 'graded', 'locked'].includes(String(p.status))) {
        return res.status(400).json({ error: 'Anda telah menyelesaikan atau terkunci dari ujian ini.' });
      }
      participantId = String(p.id);
      startTime = String(p.start_time);
    }

    // Fetch Questions
    const qRes = await db.execute({
      sql: `SELECT id, question_type, question_text, image_url, weight, order_index FROM questions WHERE exam_id = ? ORDER BY order_index ASC`,
      args: [examId],
    });

    const questions: any[] = [];
    for (const q of qRes.rows) {
      const qObj: any = {
        id: q.id,
        questionType: q.question_type,
        questionText: q.question_text,
        imageUrl: q.image_url,
        weight: Number(q.weight),
        orderIndex: Number(q.order_index),
        options: [],
        matchingPairs: [],
      };

      if (['multiple_choice', 'complex_multiple_choice', 'true_false'].includes(String(q.question_type))) {
        const optRes = await db.execute({
          sql: `SELECT id, option_text, image_url, order_index FROM question_options WHERE question_id = ? ORDER BY order_index ASC`,
          args: [q.id],
        });
        qObj.options = optRes.rows.map((o) => ({
          id: o.id,
          optionText: o.option_text,
          imageUrl: o.image_url,
          orderIndex: Number(o.order_index),
        }));
      } else if (q.question_type === 'matching') {
        const pairRes = await db.execute({
          sql: `SELECT id, left_text, right_text, order_index FROM matching_pairs WHERE question_id = ? ORDER BY order_index ASC`,
          args: [q.id],
        });
        qObj.matchingPairs = pairRes.rows.map((p) => ({
          id: p.id,
          leftText: p.left_text,
          rightText: p.right_text,
          orderIndex: Number(p.order_index),
        }));
      }

      questions.push(qObj);
    }

    // Fetch existing answers for recovery
    const existingAnsRes = await db.execute({
      sql: `SELECT question_id, answer_json, is_doubtful FROM answers WHERE participant_id = ?`,
      args: [participantId],
    });

    const savedAnswers: Record<string, { answerJson: any; isDoubtful: boolean }> = {};
    existingAnsRes.rows.forEach((r) => {
      savedAnswers[String(r.question_id)] = {
        answerJson: r.answer_json ? JSON.parse(String(r.answer_json)) : null,
        isDoubtful: Boolean(r.is_doubtful),
      };
    });

    res.json({
      participantId,
      startTime,
      durationMinutes: Number(exam.duration_minutes),
      violationLimit: Number(exam.violation_limit),
      violationAction: exam.violation_action,
      questions,
      savedAnswers,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Start exam error:', err);
    res.status(500).json({ error: 'Gagal memulai sesi ujian.' });
  }
});

// Autosave Student Answer
app.post('/api/student/exams/:id/answers', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const { participantId, questionId, answerJson, isDoubtful } = req.body;
    if (!participantId || !questionId) {
      return res.status(400).json({ error: 'Participant ID dan Question ID wajib.' });
    }

    const answerStr = JSON.stringify(answerJson);
    const ansId = `ans_${participantId}_${questionId}`;

    await db.execute({
      sql: `INSERT INTO answers (id, participant_id, question_id, answer_json, is_doubtful, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(participant_id, question_id) DO UPDATE SET
            answer_json = excluded.answer_json,
            is_doubtful = excluded.is_doubtful,
            updated_at = CURRENT_TIMESTAMP`,
      args: [ansId, participantId, questionId, answerStr, isDoubtful ? 1 : 0],
    });

    res.json({ status: 'saved', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan jawaban.' });
  }
});

// Record Violation
app.post('/api/student/exams/:id/violations', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const { participantId, eventType, description } = req.body;

    const vId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    await db.execute({
      sql: `INSERT INTO exam_violations (id, participant_id, exam_id, student_id, event_type, description) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [vId, participantId, examId, req.user!.id, eventType || 'tab_switch', description || 'Siswa berpindah tab / layar'],
    });

    // Increment violation count in participant
    await db.execute({
      sql: `UPDATE exam_participants SET violation_count = violation_count + 1 WHERE id = ?`,
      args: [participantId],
    });

    const pRes = await db.execute({ sql: `SELECT violation_count FROM exam_participants WHERE id = ?`, args: [participantId] });
    const currentViolations = Number(pRes.rows[0].violation_count);

    res.json({ currentViolations });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mencatat pelanggaran.' });
  }
});

// Finish & Finalize Exam Session (Auto Scoring Objective Questions)
app.post('/api/student/exams/:id/finish', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const examId = req.params.id;
    const { participantId } = req.body;

    // Fetch all questions and student answers
    const questionsRes = await db.execute({ sql: `SELECT * FROM questions WHERE exam_id = ?`, args: [examId] });
    const answersRes = await db.execute({ sql: `SELECT * FROM answers WHERE participant_id = ?`, args: [participantId] });

    const answerMap: Record<string, any> = {};
    answersRes.rows.forEach((r) => {
      answerMap[String(r.question_id)] = r.answer_json ? JSON.parse(String(r.answer_json)) : null;
    });

    let totalScore = 0;
    let totalMaxScore = 0;
    let essayCount = 0;

    for (const q of questionsRes.rows) {
      const qId = String(q.id);
      const qWeight = Number(q.weight || 1);
      const qType = String(q.question_type);
      totalMaxScore += qWeight;

      const studentAns = answerMap[qId];
      let questionScore = 0;

      if (qType === 'multiple_choice') {
        const correctOpt = await db.execute({ sql: `SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1`, args: [qId] });
        if (correctOpt.rows.length > 0 && String(studentAns) === String(correctOpt.rows[0].id)) {
          questionScore = qWeight;
        }
      } else if (qType === 'complex_multiple_choice') {
        const correctOpts = await db.execute({ sql: `SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1`, args: [qId] });
        const correctSet = new Set(correctOpts.rows.map((o) => String(o.id)));
        const studentSet = new Set(Array.isArray(studentAns) ? studentAns.map(String) : []);

        if (correctSet.size > 0 && studentSet.size === correctSet.size && [...studentSet].every((id) => correctSet.has(id))) {
          questionScore = qWeight;
        }
      } else if (qType === 'true_false') {
        const correctOpt = await db.execute({ sql: `SELECT id, option_text FROM question_options WHERE question_id = ? AND is_correct = 1`, args: [qId] });
        if (correctOpt.rows.length > 0 && (String(studentAns) === String(correctOpt.rows[0].id) || String(studentAns) === String(correctOpt.rows[0].option_text))) {
          questionScore = qWeight;
        }
      } else if (qType === 'matching') {
        const pairs = await db.execute({ sql: `SELECT id, left_text, right_text FROM matching_pairs WHERE question_id = ?`, args: [qId] });
        let matchedCount = 0;
        if (studentAns && typeof studentAns === 'object') {
          for (const p of pairs.rows) {
            if (studentAns[String(p.id)] === String(p.right_text)) {
              matchedCount++;
            }
          }
          if (pairs.rows.length > 0) {
            questionScore = (matchedCount / pairs.rows.length) * qWeight;
          }
        }
      } else if (qType === 'essay') {
        essayCount++;
        // Essay is graded manually by teacher later
        questionScore = 0;
      }

      totalScore += questionScore;

      // Update question score in answer
      await db.execute({
        sql: `UPDATE answers SET score_obtained = ? WHERE participant_id = ? AND question_id = ?`,
        args: [questionScore, participantId, qId],
      });
    }

    // Get KKM
    const examRes = await db.execute({ sql: `SELECT kkm FROM exams WHERE id = ?`, args: [examId] });
    const kkm = Number(examRes.rows[0].kkm || 75);
    const finalScoreScaled = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : totalScore;
    const isPassed = finalScoreScaled >= kkm;
    const finalStatus = essayCount > 0 ? 'submitted' : 'graded';

    const roundedScore = Math.round(finalScoreScaled * 100) / 100;

    await db.execute({
      sql: `UPDATE exam_participants SET
        status = ?, submit_time = CURRENT_TIMESTAMP, score = ?, is_passed = ?, total_essay_count = ?
        WHERE id = ?`,
      args: [finalStatus, roundedScore, isPassed ? 1 : 0, essayCount, participantId],
    });

    res.json({
      message: 'Ujian berhasil dikumpulkan.',
      finalScore: roundedScore,
      isPassed,
      hasEssay: essayCount > 0,
    });
  } catch (err: any) {
    console.error('Finish exam error:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan ujian.' });
  }
});

// Student Results View
app.get('/api/student/results', authenticateToken, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const studentId = req.user!.id;
    const result = await db.execute({
      sql: `SELECT ep.*, e.title as exam_title, e.subject_name, e.kkm, e.auto_release_score, e.teacher_name
            FROM exam_participants ep
            JOIN exams e ON ep.exam_id = e.id
            WHERE ep.student_id = ? AND ep.status IN ('submitted', 'graded')
            ORDER BY ep.submit_time DESC`,
      args: [studentId],
    });

    const items = result.rows.map((row) => ({
      participantId: row.id,
      examTitle: row.exam_title,
      subjectName: row.subject_name,
      teacherName: row.teacher_name,
      kkm: Number(row.kkm),
      score: Number(row.score),
      isPassed: Boolean(row.is_passed),
      autoReleaseScore: Boolean(row.auto_release_score),
      totalEssayCount: Number(row.total_essay_count),
      essayGradedCount: Number(row.essay_graded_count),
      status: row.status,
      submitTime: row.submit_time,
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat hasil ujian.' });
  }
});

// ================= VITE DEV / STATIC HANDLER =================
async function startServer() {
  await initializeDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[PJJ SPANJU CBT] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
