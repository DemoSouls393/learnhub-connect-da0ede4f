import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, Send, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";
import { notifyTeacherSubmission } from "@/lib/notifications";
import CameraVerification from "@/components/quiz/CameraVerification";
import AntiCheatMonitor from "@/components/quiz/AntiCheatMonitor";
import { cn } from "@/lib/utils";

type Assignment = Tables<"assignments"> & { max_attempts?: number; class_id: string };
type Question = Tables<"questions">;
type Submission = Tables<"submissions"> & { attempt_number?: number };
type ClassInfo = { teacher_id: string; name: string };

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const TakeQuiz = () => {
  const { classId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [cameraVerified, setCameraVerified] = useState(false);

  useEffect(() => {
    if (assignmentId && profile) {
      fetchQuizData();
    }
  }, [assignmentId, profile]);

  useEffect(() => {
    if (!assignment?.anti_cheat_enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        toast({
          title: "Cảnh báo",
          description: "Bạn đã chuyển tab. Hành động này được ghi nhận.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [assignment?.anti_cheat_enabled]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchQuizData = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      const { data: classData } = await supabase
        .from("classes")
        .select("teacher_id, name")
        .eq("id", assignmentData.class_id)
        .single();
      
      if (classData) setClassInfo(classData);

      let questionsQuery = supabase
        .from("questions")
        .select("*")
        .eq("assignment_id", assignmentId);

      if (!assignmentData.shuffle_questions) {
        questionsQuery = questionsQuery.order("order_index");
      }

      const { data: questionsData, error: questionsError } = await questionsQuery;
      if (questionsError) throw questionsError;

      let finalQuestions = questionsData || [];
      
      if (assignmentData.shuffle_questions) {
        finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }

      if (assignmentData.shuffle_answers) {
        finalQuestions = finalQuestions.map(q => {
          if (q.question_type === "multiple_choice" && q.options) {
            const opts = q.options as unknown as Option[];
            return {
              ...q,
              options: [...opts].sort(() => Math.random() - 0.5) as unknown as typeof q.options
            };
          }
          return q;
        });
      }

      setQuestions(finalQuestions);

      const { data: allSubmissionsData, error: allSubmissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", profile?.id)
        .order("attempt_number", { ascending: true });

      if (allSubmissionsError) throw allSubmissionsError;
      setAllSubmissions(allSubmissionsData || []);

      const completedAttempts = (allSubmissionsData || []).filter(
        s => s.status === "submitted" || s.status === "graded"
      ).length;

      const maxAttempts = assignmentData.max_attempts || 1;
      if (completedAttempts >= maxAttempts) {
        toast({
          title: "Hết lượt làm bài",
          description: `Bạn đã sử dụng hết ${maxAttempts} lượt làm bài cho bài này.`,
        });
        navigate(`/class/${classId}/assignment/${assignmentId}`);
        return;
      }

      const inProgressSubmission = (allSubmissionsData || []).find(s => s.status === "in_progress");

      if (inProgressSubmission) {
        setSubmission(inProgressSubmission);
        setCurrentAttempt(inProgressSubmission.attempt_number || completedAttempts + 1);
        if (inProgressSubmission.answers) {
          setAnswers(inProgressSubmission.answers as Record<string, string>);
        }

        if (assignmentData.time_limit_minutes) {
          const startTime = new Date(inProgressSubmission.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = assignmentData.time_limit_minutes * 60 - elapsed;
          setTimeLeft(Math.max(0, remaining));
        }
      } else {
        const nextAttempt = completedAttempts + 1;
        const { data: newSubmission, error: createError } = await supabase
          .from("submissions")
          .insert({
            assignment_id: assignmentId,
            student_id: profile?.id,
            status: "in_progress",
            attempt_number: nextAttempt,
          })
          .select()
          .single();

        if (createError) throw createError;
        setSubmission(newSubmission);
        setCurrentAttempt(nextAttempt);

        if (assignmentData.time_limit_minutes) {
          setTimeLeft(assignmentData.time_limit_minutes * 60);
        }
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải bài kiểm tra",
        variant: "destructive",
      });
      navigate(`/class/${classId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = useCallback(async (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (submission) {
      await supabase
        .from("submissions")
        .update({ answers: newAnswers as unknown as Json })
        .eq("id", submission.id);
    }
  }, [answers, submission]);

  const handleSubmit = async (autoSubmit = false) => {
    if (!submission || !assignment) return;

    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        if (!confirm(`Bạn còn ${unanswered.length} câu chưa trả lời. Vẫn nộp bài?`)) {
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const hasEssayQuestions = questions.some(q => q.question_type === "essay");
      
      let totalScore = 0;

      questions.forEach(q => {
        const answer = answers[q.id];
        if (!answer) return;

        if (q.question_type === "multiple_choice") {
          const opts = q.options as unknown as Option[];
          const correctOption = opts.find(o => o.isCorrect);
          if (correctOption && answer === correctOption.id) {
            totalScore += q.points || 1;
          }
        } else if (q.question_type === "true_false") {
          if (answer === q.correct_answer) {
            totalScore += q.points || 1;
          }
        } else if (q.question_type === "short_answer") {
          if (answer.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()) {
            totalScore += q.points || 1;
          }
        }
      });

      const finalStatus = hasEssayQuestions ? "submitted" : "graded";
      const finalScore = hasEssayQuestions ? null : totalScore;

      const { error } = await supabase
        .from("submissions")
        .update({
          answers: answers as unknown as Json,
          status: finalStatus,
          submitted_at: new Date().toISOString(),
          score: finalScore,
          anti_cheat_log: {
            tab_switches: tabSwitchCount,
            auto_submitted: autoSubmit,
          } as unknown as Json,
        })
        .eq("id", submission.id);

      if (error) throw error;

      if (classInfo && profile) {
        await notifyTeacherSubmission(
          classInfo.teacher_id,
          profile.full_name,
          assignment.title,
          classId!,
          assignmentId!
        );
      }

      if (hasEssayQuestions) {
        toast({
          title: "Đã nộp bài",
          description: "Bài làm đang chờ giáo viên chấm điểm.",
        });
      } else {
        toast({
          title: "Thành công",
          description: autoSubmit 
            ? `Hết giờ! Điểm: ${totalScore}/${assignment.total_points}`
            : `Đã nộp bài. Điểm: ${totalScore}/${assignment.total_points}`,
        });
      }
      
      navigate(`/class/${classId}/assignment/${assignmentId}`);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể nộp bài",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải bài kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (assignment?.camera_required && !cameraVerified) {
    return (
      <CameraVerification 
        onVerified={() => setCameraVerified(true)}
        required={true}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {submission && (
        <AntiCheatMonitor
          submissionId={submission.id}
          cameraRequired={assignment?.camera_required || false}
          antiCheatEnabled={assignment?.anti_cheat_enabled || false}
          onViolation={(type, count) => {
            if (type === "tab_switch") {
              setTabSwitchCount(count);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-lg text-foreground truncate">{assignment?.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>Câu {currentIndex + 1}/{questions.length}</span>
                <span>•</span>
                <span>Đã trả lời {answeredCount}/{questions.length}</span>
                {(assignment?.max_attempts || 1) > 1 && (
                  <>
                    <span>•</span>
                    <span>Lần {currentAttempt}/{assignment?.max_attempts}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {assignment?.anti_cheat_enabled && tabSwitchCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {tabSwitchCount}
                </Badge>
              )}

              {timeLeft !== null && (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
                  timeLeft < 60 
                    ? "bg-destructive/10 text-destructive animate-pulse" 
                    : timeLeft < 300 
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-foreground"
                )}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeLeft)}
                </div>
              )}

              <Button 
                onClick={() => handleSubmit(false)} 
                disabled={submitting} 
                className="bg-gradient-primary hover:opacity-90"
              >
                <Send className="h-4 w-4 mr-2" />
                Nộp bài
              </Button>
            </div>
          </div>

          <Progress value={progress} className="mt-4 h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="order-2 lg:order-1">
            <Card className="sticky top-32 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Danh sách câu hỏi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "w-full aspect-square rounded-lg font-medium text-sm transition-all",
                        currentIndex === index
                          ? "bg-primary text-primary-foreground shadow-md"
                          : answers[q.id]
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-sm">Câu {currentIndex + 1}</Badge>
                  <Badge className="bg-primary/10 text-primary border-0">
                    {currentQuestion.points} điểm
                  </Badge>
                </div>
                <CardTitle className="text-xl mt-4 text-foreground leading-relaxed">
                  {currentQuestion.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion.question_type === "multiple_choice" && (
                  <RadioGroup
                    value={answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {(currentQuestion.options as unknown as Option[]).map((option, index) => (
                      <div
                        key={option.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                          answers[currentQuestion.id] === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                        )}
                        onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                      >
                        <RadioGroupItem value={option.id} id={option.id} className="flex-shrink-0" />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer text-foreground">
                          <span className="font-bold text-primary mr-2">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option.text}
                        </Label>
                        {answers[currentQuestion.id] === option.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.question_type === "true_false" && (
                  <RadioGroup
                    value={answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {["true", "false"].map((value) => (
                      <div
                        key={value}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                          answers[currentQuestion.id] === value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                        )}
                        onClick={() => handleAnswerChange(currentQuestion.id, value)}
                      >
                        <RadioGroupItem value={value} id={value} />
                        <Label htmlFor={value} className="flex-1 cursor-pointer text-foreground font-medium">
                          {value === "true" ? "Đúng" : "Sai"}
                        </Label>
                        {answers[currentQuestion.id] === value && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.question_type === "short_answer" && (
                  <Input
                    placeholder="Nhập câu trả lời của bạn..."
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="text-lg py-6"
                  />
                )}

                {currentQuestion.question_type === "essay" && (
                  <Textarea
                    placeholder="Nhập câu trả lời của bạn..."
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="min-h-[200px] text-base"
                  />
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                size="lg"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Câu trước
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>

              <Button
                variant="outline"
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                size="lg"
              >
                Câu sau
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
