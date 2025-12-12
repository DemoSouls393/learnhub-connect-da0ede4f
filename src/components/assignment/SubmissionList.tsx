import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";

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
  onUpdate: () => void;
}

const SubmissionList = ({ submissions, totalPoints, onUpdate }: SubmissionListProps) => {
  const { toast } = useToast();
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const openGrading = (submission: Submission) => {
    setGradingSubmission(submission);
    setScore(submission.score || 0);
    setFeedback(submission.feedback || "");
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          score,
          feedback,
          status: "graded",
        })
        .eq("id", gradingSubmission.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã chấm điểm bài nộp",
      });
      setGradingSubmission(null);
      onUpdate();
    } catch (error) {
      console.error("Error grading:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấm điểm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Đã nộp</Badge>;
      case "graded":
        return <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Đã chấm</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Đang làm</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có bài nộp nào</p>
      </div>
    );
  }

  return (
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
          className="grid grid-cols-5 gap-4 p-3 border rounded-lg items-center"
        >
          <div>
            <p className="font-medium">{submission.profiles?.full_name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
          </div>

          <div>{getStatusBadge(submission.status)}</div>

          <div className="text-sm">
            {submission.submitted_at
              ? format(new Date(submission.submitted_at), "dd/MM/yyyy HH:mm", { locale: vi })
              : "Chưa nộp"}
          </div>

          <div className="font-medium">
            {submission.score !== null ? (
              <span className={submission.score >= totalPoints * 0.5 ? "text-success" : "text-destructive"}>
                {submission.score}/{totalPoints}
              </span>
            ) : (
              <span className="text-muted-foreground">Chưa chấm</span>
            )}
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openGrading(submission)}
              disabled={submission.status === "in_progress"}
            >
              <Eye className="h-4 w-4 mr-1" />
              {submission.score !== null ? "Xem/Sửa điểm" : "Chấm điểm"}
            </Button>
          </div>
        </div>
      ))}

      {gradingSubmission && (
        <Dialog open onOpenChange={() => setGradingSubmission(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Chấm điểm bài nộp</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-1">Học sinh</p>
                <p className="text-muted-foreground">
                  {gradingSubmission.profiles?.full_name}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Điểm (tối đa {totalPoints})</label>
                <Input
                  type="number"
                  min={0}
                  max={totalPoints}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nhận xét</label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Nhập nhận xét cho học sinh..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setGradingSubmission(null)}>
                Hủy
              </Button>
              <Button onClick={handleGrade} disabled={loading}>
                {loading ? "Đang lưu..." : "Lưu điểm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SubmissionList;
