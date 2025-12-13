import * as XLSX from "xlsx";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Submission {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  started_at: string;
  attempt_number?: number;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface ExportGradesParams {
  submissions: Submission[];
  assignmentTitle: string;
  totalPoints: number;
  className?: string;
}

export function exportGradesToExcel({
  submissions,
  assignmentTitle,
  totalPoints,
  className,
}: ExportGradesParams) {
  // Prepare data for Excel
  const data = submissions.map((s, index) => ({
    STT: index + 1,
    "Họ tên": s.profiles?.full_name || "N/A",
    Email: s.profiles?.email || "N/A",
    "Trạng thái": getStatusLabel(s.status),
    "Lần làm": s.attempt_number || 1,
    Điểm: s.score !== null ? s.score : "Chưa chấm",
    "Tổng điểm": totalPoints,
    "Phần trăm": s.score !== null ? `${Math.round((s.score / totalPoints) * 100)}%` : "-",
    "Xếp loại": s.score !== null ? getGradeLabel(s.score, totalPoints) : "-",
    "Thời gian nộp": s.submitted_at
      ? format(new Date(s.submitted_at), "dd/MM/yyyy HH:mm", { locale: vi })
      : "Chưa nộp",
    "Nhận xét": s.feedback || "",
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 5 },   // STT
    { wch: 25 },  // Họ tên
    { wch: 30 },  // Email
    { wch: 15 },  // Trạng thái
    { wch: 10 },  // Lần làm
    { wch: 10 },  // Điểm
    { wch: 10 },  // Tổng điểm
    { wch: 12 },  // Phần trăm
    { wch: 10 },  // Xếp loại
    { wch: 20 },  // Thời gian nộp
    { wch: 40 },  // Nhận xét
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Bảng điểm");

  // Generate filename
  const safeTitle = assignmentTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "").substring(0, 50);
  const dateStr = format(new Date(), "ddMMyyyy");
  const filename = `BangDiem_${safeTitle}_${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Chờ chấm";
    case "graded":
      return "Đã chấm";
    case "in_progress":
      return "Đang làm";
    default:
      return status;
  }
}

function getGradeLabel(score: number, totalPoints: number): string {
  const percent = (score / totalPoints) * 100;
  if (percent >= 90) return "Giỏi";
  if (percent >= 70) return "Khá";
  if (percent >= 50) return "Trung bình";
  return "Yếu";
}

// Export class grade report with multiple assignments
interface ClassGradeReport {
  students: Array<{
    id: string;
    full_name: string;
    email: string;
    assignments: Record<string, { score: number | null; status: string }>;
  }>;
  assignments: Array<{ id: string; title: string; totalPoints: number }>;
  className: string;
}

export function exportClassGradesToExcel({ students, assignments, className }: ClassGradeReport) {
  // Create header row
  const headers = ["STT", "Họ tên", "Email"];
  assignments.forEach((a) => {
    headers.push(`${a.title} (${a.totalPoints}đ)`);
  });
  headers.push("Tổng điểm", "Điểm TB");

  // Create data rows
  const data = students.map((student, index) => {
    const row: Record<string, string | number> = {
      STT: index + 1,
      "Họ tên": student.full_name,
      Email: student.email,
    };

    let totalScore = 0;
    let totalMaxPoints = 0;
    let gradedCount = 0;

    assignments.forEach((a) => {
      const submission = student.assignments[a.id];
      if (submission && submission.score !== null) {
        row[`${a.title} (${a.totalPoints}đ)`] = submission.score;
        totalScore += submission.score;
        totalMaxPoints += a.totalPoints;
        gradedCount++;
      } else {
        row[`${a.title} (${a.totalPoints}đ)`] = "-";
      }
    });

    row["Tổng điểm"] = gradedCount > 0 ? `${totalScore}/${totalMaxPoints}` : "-";
    row["Điểm TB"] = gradedCount > 0 ? Math.round((totalScore / totalMaxPoints) * 100) / 10 : "-";

    return row;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = [
    { wch: 5 },
    { wch: 25 },
    { wch: 30 },
    ...assignments.map(() => ({ wch: 20 })),
    { wch: 15 },
    { wch: 10 },
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Tổng hợp điểm");

  const safeClassName = className.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "").substring(0, 30);
  const dateStr = format(new Date(), "ddMMyyyy");
  const filename = `TongHopDiem_${safeClassName}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
