import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, HelpCircle, Save, CheckCheck } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";

type Question = Tables<"questions">;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

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

interface SubmissionGradingDialogProps {
  submission: Submission;
  questions: Question[];
  totalPoints: number;
  onClose: () => void;
  onSave: () => void;
}

const SubmissionGradingDialog = ({
  submission,
  questions,
  totalPoints,
  onClose,
  onSave,
}: SubmissionGradingDialogProps) => {
  const { toast } = useToast();
  const [score, setScore] = useState<number>(submission.score || 0);
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(submission);

  // Realtime subscription for grading updates
  useEffect(() => {
    const channel = supabase
      .channel(`grading-${submission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
          filter: `id=eq.${submission.id}`
        },
        (payload) => {
          const updated = payload.new as typeof submission;
          setCurrentSubmission(prev => ({ ...prev, ...updated }));
          if (updated.score !== null) setScore(updated.score);
          if (updated.feedback) setFeedback(updated.feedback);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submission.id]);

  const getQuestionResult = (question: Question) => {
    const answer = submission.answers?.[question.id];
    if (!answer) return { status: "unanswered", correct: false };

    if (question.question_type === "multiple_choice") {
      const opts = question.options as unknown as Option[];
      const correctOption = opts.find(o => o.isCorrect);
      const isCorrect = correctOption && answer === correctOption.id;
      return { status: isCorrect ? "correct" : "incorrect", correct: isCorrect };
    } else if (question.question_type === "true_false") {
      const isCorrect = answer === question.correct_answer;
      return { status: isCorrect ? "correct" : "incorrect", correct: isCorrect };
    } else if (question.question_type === "short_answer") {
      const isCorrect = answer.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
      return { status: isCorrect ? "correct" : "incorrect", correct: isCorrect };
    }
    return { status: "needs_review", correct: false };
  };

  const getAnswerDisplay = (question: Question) => {
    const answer = submission.answers?.[question.id];
    if (!answer) return "Không trả lời";

    if (question.question_type === "multiple_choice") {
      const opts = question.options as unknown as Option[];
      const selectedOption = opts.find(o => o.id === answer);
      return selectedOption?.text || answer;
    } else if (question.question_type === "true_false") {
      return answer === "true" ? "Đúng" : "Sai";
    }
    return answer;
  };

  const getCorrectAnswerDisplay = (question: Question) => {
    if (question.question_type === "multiple_choice") {
      const opts = question.options as unknown as Option[];
      const correctOption = opts.find(o => o.isCorrect);
      return correctOption?.text || "N/A";
    } else if (question.question_type === "true_false") {
      return question.correct_answer === "true" ? "Đúng" : "Sai";
    } else if (question.question_type === "short_answer") {
      return question.correct_answer || "N/A";
    }
    return "Cần chấm thủ công";
  };

  const handleQuestionScoreChange = (questionId: string, pts: number) => {
    setQuestionScores(prev => ({ ...prev, [questionId]: pts }));
    
    // Recalculate total
    const newTotal = questions.reduce((sum, q) => {
      if (questionScores[q.id] !== undefined) {
        return sum + (q.id === questionId ? pts : questionScores[q.id]);
      }
      const result = getQuestionResult(q);
      if (result.status === "correct") {
        return sum + (q.points || 1);
      }
      return sum;
    }, 0);
    setScore(newTotal);
  };

  const handleAutoGrade = () => {
    let autoScore = 0;
    const scores: Record<string, number> = {};
    
    questions.forEach(q => {
      const result = getQuestionResult(q);
      if (result.correct) {
        autoScore += q.points || 1;
        scores[q.id] = q.points || 1;
      } else {
        scores[q.id] = 0;
      }
    });
    
    setScore(autoScore);
    setQuestionScores(scores);
    toast({
      title: "Đã chấm điểm tự động",
      description: `Điểm: ${autoScore}/${totalPoints}`,
    });
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          score,
          feedback,
        })
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Đã lưu nháp",
        description: "Điểm và nhận xét đã được lưu",
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu điểm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGrading = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          score,
          feedback,
          status: "graded",
        })
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Hoàn thành chấm điểm",
        description: `Đã chấm điểm: ${score}/${totalPoints}`,
      });
      onSave();
    } catch (error) {
      console.error("Error grading:", error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành chấm điểm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chấm điểm - {submission.profiles?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleAutoGrade}>
              Chấm tự động
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {questions.map((question, index) => {
              const result = getQuestionResult(question);
              const studentAnswer = getAnswerDisplay(question);
              const correctAnswer = getCorrectAnswerDisplay(question);

              return (
                <div key={question.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Câu {index + 1}:</span>
                      <Badge variant="outline">
                        {question.question_type === "multiple_choice" && "Trắc nghiệm"}
                        {question.question_type === "true_false" && "Đúng/Sai"}
                        {question.question_type === "short_answer" && "Trả lời ngắn"}
                        {question.question_type === "essay" && "Tự luận"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.status === "correct" && (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                      {result.status === "incorrect" && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      {result.status === "needs_review" && (
                        <HelpCircle className="h-5 w-5 text-warning" />
                      )}
                      {result.status === "unanswered" && (
                        <Badge variant="secondary">Không trả lời</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-muted-foreground">{question.question_text}</p>

                  <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Câu trả lời của học sinh:</p>
                      <p className={`${result.status === "incorrect" ? "text-destructive" : ""}`}>
                        {studentAnswer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Đáp án đúng:</p>
                      <p className="text-success">{correctAnswer}</p>
                    </div>
                  </div>

                  {(question.question_type === "essay" || question.question_type === "short_answer") && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Điểm:</span>
                      <Input
                        type="number"
                        min={0}
                        max={question.points || 1}
                        value={questionScores[question.id] ?? ""}
                        onChange={(e) => handleQuestionScoreChange(question.id, Number(e.target.value))}
                        className="w-20"
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground">/ {question.points || 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Tổng điểm</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={totalPoints}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">/ {totalPoints}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nhận xét</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhập nhận xét cho học sinh..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            {currentSubmission.status === "graded" && (
              <Badge className="bg-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Đã chấm điểm
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            Lưu nháp
          </Button>
          <Button onClick={handleCompleteGrading} disabled={loading}>
            <CheckCheck className="h-4 w-4 mr-1" />
            {loading ? "Đang lưu..." : "Hoàn thành chấm điểm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionGradingDialog;
