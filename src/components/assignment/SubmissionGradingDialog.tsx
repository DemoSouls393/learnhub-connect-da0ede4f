import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, XCircle, HelpCircle, Save, CheckCheck, 
  Wand2, AlertCircle, User, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Initialize question scores
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    questions.forEach(q => {
      const result = getQuestionResult(q);
      if (result.correct) {
        initialScores[q.id] = q.points || 1;
      } else {
        initialScores[q.id] = 0;
      }
    });
    setQuestionScores(initialScores);
    
    // Calculate initial score
    const initialTotal = Object.values(initialScores).reduce((sum, s) => sum + s, 0);
    if (submission.score === null) {
      setScore(initialTotal);
    }
  }, [questions]);

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
    const question = questions.find(q => q.id === questionId);
    const maxPoints = question?.points || 1;
    const validPts = Math.min(Math.max(0, pts), maxPoints);
    
    setQuestionScores(prev => {
      const newScores = { ...prev, [questionId]: validPts };
      const newTotal = Object.values(newScores).reduce((sum, s) => sum + s, 0);
      setScore(newTotal);
      return newScores;
    });
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
        description: "Điểm và nhận xét đã được lưu. Điểm chưa được công bố.",
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
        description: `Đã công bố điểm: ${score}/${totalPoints}`,
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
      setShowConfirmDialog(false);
    }
  };

  const hasEssayQuestions = questions.some(q => q.question_type === "essay");
  const isGraded = currentSubmission.status === "graded";

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          {/* Fixed Header */}
          <div className="px-6 py-4 border-b bg-card">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">
                      {submission.profiles?.full_name || "Học sinh"}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {submission.submitted_at 
                        ? format(new Date(submission.submitted_at), "dd/MM/yyyy HH:mm", { locale: vi })
                        : "Chưa nộp"}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isGraded ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Đã công bố điểm
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Chờ chấm điểm
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-4">
              {questions.map((question, index) => {
                const result = getQuestionResult(question);
                const studentAnswer = getAnswerDisplay(question);
                const correctAnswer = getCorrectAnswerDisplay(question);
                const currentScore = questionScores[question.id] ?? 0;

                return (
                  <div key={question.id} className="border rounded-lg overflow-hidden">
                    {/* Question Header */}
                    <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Câu {index + 1}</span>
                        <Badge variant="outline" className="text-xs">
                          {question.question_type === "multiple_choice" && "Trắc nghiệm"}
                          {question.question_type === "true_false" && "Đúng/Sai"}
                          {question.question_type === "short_answer" && "Trả lời ngắn"}
                          {question.question_type === "essay" && "Tự luận"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === "correct" && (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Đúng
                          </Badge>
                        )}
                        {result.status === "incorrect" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Sai
                          </Badge>
                        )}
                        {result.status === "needs_review" && (
                          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            Cần chấm
                          </Badge>
                        )}
                        {result.status === "unanswered" && (
                          <Badge variant="secondary">Không trả lời</Badge>
                        )}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="p-4 space-y-3">
                      <p className="font-medium">{question.question_text}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Câu trả lời của học sinh
                          </p>
                          <p className={`text-sm ${result.status === "incorrect" ? "text-destructive" : ""}`}>
                            {studentAnswer}
                          </p>
                        </div>
                        <div className="bg-success/10 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Đáp án đúng
                          </p>
                          <p className="text-sm text-success">{correctAnswer}</p>
                        </div>
                      </div>

                      {/* Score Input */}
                      <div className="flex items-center gap-3 pt-2 border-t">
                        <span className="text-sm font-medium">Điểm:</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={question.points || 1}
                            value={currentScore}
                            onChange={(e) => handleQuestionScoreChange(question.id, Number(e.target.value))}
                            className="w-20 h-8 text-center"
                          />
                          <span className="text-sm text-muted-foreground">/ {question.points || 1}</span>
                        </div>
                        {question.question_type !== "essay" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const pts = result.correct ? (question.points || 1) : 0;
                              handleQuestionScoreChange(question.id, pts);
                            }}
                            className="ml-auto text-xs"
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            Tự động
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t bg-card space-y-4">
            {/* Total Score */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Tổng điểm</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={totalPoints}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-24 h-10 text-center text-lg font-bold"
                  />
                  <span className="text-muted-foreground text-lg">/ {totalPoints}</span>
                  <Badge 
                    className={`ml-2 ${
                      score / totalPoints >= 0.8 
                        ? "bg-success text-success-foreground" 
                        : score / totalPoints >= 0.5 
                          ? "bg-warning/20 text-warning-foreground"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {Math.round((score / totalPoints) * 100)}%
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleAutoGrade}>
                <Wand2 className="h-4 w-4 mr-1" />
                Chấm tự động tất cả
              </Button>
            </div>

            {/* Feedback */}
            <div>
              <label className="text-sm font-medium block mb-1">Nhận xét cho học sinh</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhập nhận xét, góp ý cho học sinh..."
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  Lưu nháp
                </Button>
                <Button 
                  onClick={() => setShowConfirmDialog(true)} 
                  disabled={loading}
                  className="bg-success hover:bg-success/90"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  {isGraded ? "Cập nhật điểm" : "Xác nhận & Công bố điểm"}
                </Button>
              </div>
            </div>

            {hasEssayQuestions && !isGraded && (
              <p className="text-xs text-muted-foreground text-center">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Bài có câu tự luận. Điểm sẽ được công bố cho học sinh sau khi bạn xác nhận.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận công bố điểm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn công bố điểm cho học sinh <strong>{submission.profiles?.full_name}</strong>?
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Điểm số:</span>
                  <span className="font-bold">{score}/{totalPoints} ({Math.round((score/totalPoints)*100)}%)</span>
                </div>
                {feedback && (
                  <div>
                    <span className="text-sm text-muted-foreground">Nhận xét:</span>
                    <p className="text-sm mt-1">{feedback}</p>
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm">
                Sau khi công bố, học sinh sẽ thấy được điểm và nhận xét của bài làm.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCompleteGrading}
              className="bg-success hover:bg-success/90"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Xác nhận công bố
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SubmissionGradingDialog;