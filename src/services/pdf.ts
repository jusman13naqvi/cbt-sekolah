import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportExamResultsToPDF(
  exam: any,
  participants: any[],
  schoolInfo = {
    name: 'SMP Negeri 7 Muara Badak',
    npsn: '30401234',
    address: 'Jl. Pendidikan No. 07, Muara Badak, Kutai Kartanegara',
    isKsrg: true,
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header / Kop Surat Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`NPSN: ${schoolInfo.npsn} | Candidate Google Reference School (KSRG)`, pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(9);
  doc.text(schoolInfo.address, pageWidth / 2, 26, { align: 'center' });

  // Double horizontal line divider
  doc.setLineWidth(0.8);
  doc.line(14, 29, pageWidth - 14, 29);
  doc.setLineWidth(0.2);
  doc.line(14, 30, pageWidth - 14, 30);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL ULANGAN HARIAN CBT', pageWidth / 2, 37, { align: 'center' });

  // Metadata Table Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const metaY = 43;
  doc.text(`Mata Pelajaran : ${exam.subjectName}`, 14, metaY);
  doc.text(`Judul Ujian        : ${exam.title}`, 14, metaY + 5);
  doc.text(`Kelas / Rombel   : ${exam.className}`, 14, metaY + 10);

  doc.text(`Guru Pengampu : ${exam.teacherName}`, pageWidth - 80, metaY);
  doc.text(`KKM                   : ${exam.kkm}`, pageWidth - 80, metaY + 5);
  doc.text(`Tanggal Cetak  : ${new Date().toLocaleDateString('id-ID')}`, pageWidth - 80, metaY + 10);

  // Statistics calculation
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  const tableBody = participants.map((p, index) => {
    let ket = 'Menunggu Penilaian';
    if (p.status === 'graded' || p.status === 'submitted') {
      if (p.totalEssayCount > 0 && p.essayGradedCount < p.totalEssayCount) {
        ket = 'Proses Esai';
        pendingCount++;
      } else if (p.score >= exam.kkm) {
        ket = 'Tuntas';
        passedCount++;
      } else {
        ket = 'Tidak Tuntas';
        failedCount++;
      }
    } else {
      pendingCount++;
    }

    const formattedScore = p.score !== null && p.score !== undefined
      ? Number(p.score).toFixed(2).replace(/\.00$/, '')
      : '0';

    const violationText = p.violationCount > 0 ? `${p.violationCount}x Catatan` : 'Nihil';

    return [
      index + 1,
      p.studentName,
      p.className,
      p.studentNisn || '-',
      formattedScore,
      violationText,
      ket,
    ];
  });

  // Generate Table using autoTable with widen "Catatan Pelanggaran" column width
  autoTable(doc, {
    startY: metaY + 15,
    head: [['No', 'Nama Siswa', 'Kelas', 'NISN', 'Nilai CBT', 'Catatan Pelanggaran', 'Keterangan']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Midnight Navy
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 34 },
      6: { halign: 'center', cellWidth: 28 },
    },
  });

  // Summary Box below table
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 250, 252);
  doc.rect(14, finalY, 100, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, finalY, 100, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RINGKASAN KETUNTASAN SISWA:', 18, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Peserta  : ${participants.length} Siswa`, 18, finalY + 10);
  doc.text(`Tuntas (>= KKM): ${passedCount} Siswa`, 18, finalY + 14);
  doc.text(`Belum Tuntas   : ${failedCount} Siswa | Menunggu: ${pendingCount} Siswa`, 18, finalY + 18);

  // Signatures Area
  const sigY = finalY + 5;
  doc.text('Muara Badak, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - 65, sigY);
  doc.text('Guru Pengampu Mata Pelajaran,', pageWidth - 65, sigY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(exam.teacherName, pageWidth - 65, sigY + 22);

  // Download PDF
  const filename = `Laporan_Hasil_CBT_${exam.subjectName}_${exam.className}_${Date.now()}.pdf`;
  doc.save(filename);
}
