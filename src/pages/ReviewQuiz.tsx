import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Circle, AlertCircle, Award, MessageSquare } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

type Assignment = Tables<"assignments">;
type Question = Tables<"questions">;
type Submission = Tables<"submissions">;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const ReviewQuiz = () => {
  const { classId, assignmentId, submissionId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (submissionId && profile) {
      fetchData();
    }
  }, [submissionId, profile]);

  const fetchData = async () => {
    try {
      const { data: subData, error: subError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (subError) throw subError;
      setSubmission(subData);
      setAnswers((subData.answers as Record<string, string>) || {});

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu bài làm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCorrectAnswer = (question: Question, userAnswer: string) => {
    if (!userAnswer) return false;

    switch (question.question_type) {
      case "multiple_choice": {
        const opts = question.options as unknown as Option[];
        const correctOption = opts.find((o) => o.isCorrect);
        return correctOption && userAnswer === correctOption.id;
      }
      case "true_false":
        return userAnswer === question.correct_answer;
      case "short_answer":
        return userAnswer.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Không tìm thấy bài làm</p>
        </div>
      </div>
    );
  }

  const correctCount = questions.filter((q) => isCorrectAnswer(q, answers[q.id]) === true).length;
  const incorrectCount = questions.filter((q) => isCorrectAnswer(q, answers[q.id]) === false).length;
  const essayCount = questions.filter((q) => q.question_type === "essay").length;
  const scorePercentage = submission.score !== null && assignment.total_points 
    ? (submission.score / assignment.total_points) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}/assignment/${assignmentId}`)}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>

          {/* Header Card */}
          <Card className="border-0 shadow-sm mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{assignment.title}</h1>
                  <p className="text-muted-foreground">Xem lại bài làm của bạn</p>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score Circle */}
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${scorePercentage * 2.51} 251`}
                        className={cn(
                          scorePercentage >= 80 ? "text-success" :
                          scorePercentage >= 50 ? "text-warning" :
                          "text-destructive"
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground">
                        {submission.score ?? "?"}
                      </span>
                      <span className="text-xs text-muted-foreground">/{assignment.total_points}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-foreground">{correctCount} đúng</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-foreground">{incorrectCount} sai</span>
                    </div>
                    {essayCount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{essayCount} tự luận</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Feedback */}
          {submission.feedback && (
            <Card className="border-0 shadow-sm mb-8 bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Nhận xét của giáo viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{submission.feedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Questions Review */}
          <div className="space-y-4">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const correct = isCorrectAnswer(question, userAnswer);
              const isEssay = question.question_type === "essay";

              return (
                <Card
                  key={question.id}
                  className={cn(
                    "border-0 shadow-sm",
                    isEssay
                      ? "bg-card"
                      : correct
                      ? "bg-success/5 ring-1 ring-success/20"
                      : "bg-destructive/5 ring-1 ring-destructive/20"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Câu {index + 1}</Badge>
                        <Badge className="bg-primary/10 text-primary border-0">
                          {question.points} điểm
                        </Badge>
                      </div>
                      {!isEssay && (
                        correct ? (
                          <Badge className="bg-success text-success-foreground gap-1">
                            <CheckCircle className="h-3 w-3" /> Đúng
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Sai
                          </Badge>
                        )
                      )}
                      {isEssay && (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" /> Tự luận
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3 text-foreground">
                      {question.question_text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Multiple choice options */}
                    {question.question_type === "multiple_choice" && (
                      <div className="space-y-2">
                        {(question.options as unknown as Option[]).map((option, optIndex) => {
                          const isSelected = userAnswer === option.id;
                          const isCorrectOption = option.isCorrect;

                          return (
                            <div
                              key={option.id}
                              className={cn(
                                "p-3 rounded-lg border-2 flex items-center gap-3",
                                isCorrectOption
                                  ? "border-success bg-success/10"
                                  : isSelected
                                  ? "border-destructive bg-destructive/10"
                                  : "border-border bg-card"
                              )}
                            >
                              {isCorrectOption && <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />}
                              {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                              {!isCorrectOption && !isSelected && <div className="w-4 h-4 flex-shrink-0" />}
                              <span className="font-bold text-muted-foreground mr-1">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span className="flex-1 text-foreground">{option.text}</span>
                              {isSelected && (
                                <Badge variant="outline" className="ml-auto flex-shrink-0">
                                  Bạn chọn
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False */}
                    {question.question_type === "true_false" && (
                      <div className="space-y-2">
                        {["true", "false"].map((value) => {
                          const isSelected = userAnswer === value;
                          const isCorrectOption = question.correct_answer === value;

                          return (
                            <div
                              key={value}
                              className={cn(
                                "p-3 rounded-lg border-2 flex items-center gap-3",
                                isCorrectOption
                                  ? "border-success bg-success/10"
                                  : isSelected
                                  ? "border-destructive bg-destructive/10"
                                  : "border-border bg-card"
                              )}
                            >
                              {isCorrectOption && <CheckCircle className="h-4 w-4 text-success" />}
                              {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-destructive" />}
                              {!isCorrectOption && !isSelected && <div className="w-4 h-4" />}
                              <span className="flex-1 text-foreground font-medium">
                                {value === "true" ? "Đúng" : "Sai"}
                              </span>
                              {isSelected && (
                                <Badge variant="outline">Bạn chọn</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short answer / Essay */}
                    {(question.question_type === "short_answer" || question.question_type === "essay") && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Câu trả lời của bạn:</p>
                          <div className={cn(
                            "p-4 rounded-lg border",
                            isEssay ? "border-border bg-muted/50" : correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
                          )}>
                            <p className="text-foreground whitespace-pre-wrap">
                              {userAnswer || <span className="text-muted-foreground italic">Không trả lời</span>}
                            </p>
                          </div>
                        </div>
                        {question.question_type === "short_answer" && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Đáp án đúng:</p>
                            <div className="p-4 rounded-lg border border-success bg-success/10">
                              <p className="text-foreground">{question.correct_answer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Back to Assignment */}
          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate(`/class/${classId}/assignment/${assignmentId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại bài tập
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewQuiz;
