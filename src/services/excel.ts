import * as XLSX from 'xlsx';

// 1. Download Student Import Template (XLSX)
export function downloadStudentTemplate() {
  const templateData = [
    {
      'NISN': '0081234567',
      'Nama Lengkap': 'Ahmad Fauzi',
      'Username': 'fauzi008',
      'Kelas': '7A',
      'Jenis Kelamin': 'L',
      'Password': 'spanju123',
    },
    {
      'NISN': '0081234568',
      'Nama Lengkap': 'Siti Rahmawati',
      'Username': 'rahma008',
      'Kelas': '7A',
      'Jenis Kelamin': 'P',
      'Password': 'spanju123',
    },
    {
      'NISN': '0071234569',
      'Nama Lengkap': 'Budi Prasetyo',
      'Username': 'budi007',
      'Kelas': '8A',
      'Jenis Kelamin': 'L',
      'Password': 'spanju123',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // NISN
    { wch: 25 }, // Nama
    { wch: 15 }, // Username
    { wch: 10 }, // Kelas
    { wch: 15 }, // JK
    { wch: 15 }, // Password
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa SPANJU');
  XLSX.writeFile(wb, 'Template_Impor_Siswa_SPANJU.xlsx');
}

// 2. Parse uploaded XLSX / CSV file into JSON rows
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file .xlsx atau .csv valid.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsArrayBuffer(file);
  });
}

// 3. Export Exam Results to Excel XLSX with school header & statistics summary
export function exportExamResultsToExcel(exam: any, participants: any[], schoolName = 'SMP Negeri 7 Muara Badak') {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const headerRows = [
    [`LAPORAN HASIL ULANGAN HARIAN (CBT)`],
    [schoolName.toUpperCase()],
    [`Kandidat Sekolah Rujukan Google (KSRG)`],
    [''],
    [`Judul Ujian: ${exam.title}`],
    [`Mata Pelajaran: ${exam.subjectName}`, ``, `Kelas: ${exam.className}`],
    [`Guru Pengampu: ${exam.teacherName}`, ``, `KKM: ${exam.kkm}`],
    [`Tanggal Cetak: ${dateStr}`],
    [''],
  ];

  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  const dataTable = participants.map((p, index) => {
    let statusKet = 'Menunggu Penilaian';
    if (p.status === 'graded' || p.status === 'submitted') {
      if (p.totalEssayCount > 0 && p.essayGradedCount < p.totalEssayCount) {
        statusKet = 'Menunggu Penilaian Esai';
        pendingCount++;
      } else if (p.score >= exam.kkm) {
        statusKet = 'Tuntas';
        passedCount++;
      } else {
        statusKet = 'Tidak Tuntas';
        failedCount++;
      }
    } else {
      pendingCount++;
    }

    return {
      'No': index + 1,
      'Nama Siswa': p.studentName,
      'Kelas': p.className,
      'NISN': p.studentNisn || '-',
      'Nilai Ujian': p.score ?? 0,
      'Data Pelanggaran': p.violationCount > 0 ? `${p.violationCount} kali catatan` : 'Tidak Ada',
      'Nilai': p.score ?? 0,
      'Keterangan': statusKet,
    };
  });

  const summaryRows = [
    [''],
    ['RINGKASAN STATISTIK KETUNTASAN'],
    [`Total Peserta Ujian`, participants.length],
    [`Jumlah Tuntas (>= KKM)`, passedCount],
    [`Jumlah Tidak Tuntas (< KKM)`, failedCount],
    [`Jumlah Menunggu Penilaian`, pendingCount],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_json(ws, dataTable, { origin: 'A10', skipHeader: false });
  XLSX.utils.sheet_add_aoa(ws, summaryRows, { origin: `A${12 + dataTable.length}` });

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 28 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 15 }, // NISN
    { wch: 14 }, // Nilai Ujian
    { wch: 20 }, // Pelanggaran
    { wch: 12 }, // Nilai
    { wch: 22 }, // Keterangan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hasil Ujian CBT');

  const fileName = `Laporan_CBT_${exam.subjectName}_${exam.className}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
