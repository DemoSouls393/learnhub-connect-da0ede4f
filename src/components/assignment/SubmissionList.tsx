import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, CheckCircle, Clock, AlertCircle, FileText, Download } from "lucide-react";
import SubmissionGradingDialog from "./SubmissionGradingDialog";
import { exportGradesToExcel } from "@/lib/exportExcel";
import type { Tables } from "@/integrations/supabase/types";

type Question = Tables<"questions">;

interface Submission {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  started_at: string;
  answers: Record<string, string> | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SubmissionListProps {
  submissions: Submission[];
  totalPoints: number;
  assignmentId: string;
  assignmentTitle: string;
  onUpdate: () => void;
}

const SubmissionList = ({ submissions, totalPoints, assignmentId, assignmentTitle, onUpdate }: SubmissionListProps) => {
  const { toast } = useToast();
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchQuestions();

    // Setup realtime subscription
    const channel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `assignment_id=eq.${assignmentId}`
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignmentId]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("order_index");
    
    setQuestions(data || []);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Chờ chấm</Badge>;
      case "graded":
        return <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Đã chấm</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Đang làm</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "";
    const percentage = (score / totalPoints) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Chưa có bài nộp nào</p>
        <p className="text-sm">Học sinh sẽ xuất hiện ở đây khi họ bắt đầu làm bài</p>
      </div>
    );
  }

  const handleExportExcel = () => {
    exportGradesToExcel({
      submissions,
      assignmentTitle,
      totalPoints,
    });
  };

  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Xuất Excel
        </Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
          <span>Học sinh</span>
          <span>Trạng thái</span>
          <span>Thời gian nộp</span>
          <span>Điểm</span>
          <span>Hành động</span>
        </div>

      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="grid grid-cols-5 gap-4 p-3 border rounded-lg items-center hover:bg-muted/50 transition-colors"
        >
          <div>
            <p className="font-medium">{submission.profiles?.full_name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
          </div>

          <div>{getStatusBadge(submission.status)}</div>

          <div className="text-sm">
            {submission.submitted_at
              ? format(new Date(submission.submitted_at), "dd/MM/yyyy HH:mm", { locale: vi })
              : <span className="text-muted-foreground">Chưa nộp</span>}
          </div>

          <div className="font-medium">
            {submission.score !== null ? (
              <span className={getScoreColor(submission.score)}>
                {submission.score}/{totalPoints}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGradingSubmission(submission)}
              disabled={submission.status === "in_progress"}
            >
              <Eye className="h-4 w-4 mr-1" />
              {submission.status === "graded" ? "Xem lại" : "Chấm điểm"}
            </Button>
          </div>
        </div>
      ))}

      {gradingSubmission && (
        <SubmissionGradingDialog
          submission={gradingSubmission}
          questions={questions}
          totalPoints={totalPoints}
          onClose={() => setGradingSubmission(null)}
          onSave={() => {
            setGradingSubmission(null);
            onUpdate();
          }}
        />
      )}
      </div>
    </div>
  );
};

export default SubmissionList;
