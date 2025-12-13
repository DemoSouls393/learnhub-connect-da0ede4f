import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Circle, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Navbar } from "@/components/layout/Navbar";

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
      // Fetch submission
      const { data: subData, error: subError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (subError) throw subError;
      setSubmission(subData);
      setAnswers((subData.answers as Record<string, string>) || {});

      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch questions
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
        return null; // Essay - cannot auto-grade
    }
  };

  const getAnswerDisplay = (question: Question, userAnswer: string) => {
    if (question.question_type === "multiple_choice") {
      const opts = question.options as unknown as Option[];
      const selectedOption = opts.find((o) => o.id === userAnswer);
      return selectedOption?.text || "Không trả lời";
    }
    if (question.question_type === "true_false") {
      return userAnswer === "true" ? "Đúng" : userAnswer === "false" ? "Sai" : "Không trả lời";
    }
    return userAnswer || "Không trả lời";
  };

  const getCorrectAnswerDisplay = (question: Question) => {
    if (question.question_type === "multiple_choice") {
      const opts = question.options as unknown as Option[];
      const correctOption = opts.find((o) => o.isCorrect);
      return correctOption?.text || "N/A";
    }
    if (question.question_type === "true_false") {
      return question.correct_answer === "true" ? "Đúng" : "Sai";
    }
    return question.correct_answer || "N/A";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy bài làm</p>
      </div>
    );
  }

  const correctCount = questions.filter((q) => isCorrectAnswer(q, answers[q.id]) === true).length;
  const incorrectCount = questions.filter((q) => isCorrectAnswer(q, answers[q.id]) === false).length;
  const essayCount = questions.filter((q) => q.question_type === "essay").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}/assignment/${assignmentId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Xem lại bài làm: {assignment.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Điểm: <strong className="text-foreground">{submission.score ?? "Chờ chấm"}/{assignment.total_points}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle className="h-4 w-4" /> {correctCount} đúng
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> {incorrectCount} sai
                </span>
                {essayCount > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Circle className="h-4 w-4" /> {essayCount} tự luận
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {submission.feedback && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Nhận xét của giáo viên</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{submission.feedback}</p>
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
                className={`border-2 ${
                  isEssay
                    ? "border-muted"
                    : correct
                    ? "border-success/50 bg-success/5"
                    : "border-destructive/50 bg-destructive/5"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Câu {index + 1}</Badge>
                      <Badge variant="secondary">{question.points} điểm</Badge>
                      {!isEssay && (
                        correct ? (
                          <Badge className="bg-success">
                            <CheckCircle className="h-3 w-3 mr-1" /> Đúng
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" /> Sai
                          </Badge>
                        )
                      )}
                      {isEssay && (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" /> Tự luận
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{question.question_text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Multiple choice options */}
                  {question.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      {(question.options as unknown as Option[]).map((option, optIndex) => {
                        const isSelected = userAnswer === option.id;
                        const isCorrectOption = option.isCorrect;

                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectOption
                                ? "border-success bg-success/10"
                                : isSelected
                                ? "border-destructive bg-destructive/10"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrectOption && <CheckCircle className="h-4 w-4 text-success" />}
                              {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-destructive" />}
                              <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                              <span>{option.text}</span>
                              {isSelected && <Badge variant="outline" className="ml-auto">Bạn chọn</Badge>}
                            </div>
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
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectOption
                                ? "border-success bg-success/10"
                                : isSelected
                                ? "border-destructive bg-destructive/10"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrectOption && <CheckCircle className="h-4 w-4 text-success" />}
                              {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-destructive" />}
                              <span>{value === "true" ? "Đúng" : "Sai"}</span>
                              {isSelected && <Badge variant="outline" className="ml-auto">Bạn chọn</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short answer / Essay */}
                  {(question.question_type === "short_answer" || question.question_type === "essay") && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Câu trả lời của bạn:</p>
                        <div className={`p-3 rounded-lg border ${
                          isEssay ? "border-border" : correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
                        }`}>
                          <p className="whitespace-pre-wrap">{userAnswer || "Không trả lời"}</p>
                        </div>
                      </div>
                      {question.question_type === "short_answer" && (
                        <div>
                          <p className="text-sm font-medium mb-1">Đáp án đúng:</p>
                          <div className="p-3 rounded-lg border border-success bg-success/10">
                            <p>{question.correct_answer}</p>
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
      </div>
    </div>
  );
};

export default ReviewQuiz;
