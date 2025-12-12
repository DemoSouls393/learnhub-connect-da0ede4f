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
import { Clock, AlertTriangle, Send, ChevronLeft, ChevronRight } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";
import { notifyTeacherSubmission } from "@/lib/notifications";

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

  useEffect(() => {
    if (assignmentId && profile) {
      fetchQuizData();
    }
  }, [assignmentId, profile]);

  // Anti-cheat: Tab switch detection
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

  // Timer
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
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch class info for teacher notification
      const { data: classData } = await supabase
        .from("classes")
        .select("teacher_id, name")
        .eq("id", assignmentData.class_id)
        .single();
      
      if (classData) setClassInfo(classData);

      // Fetch questions
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
      
      // Shuffle questions if enabled
      if (assignmentData.shuffle_questions) {
        finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }

      // Shuffle answers if enabled  
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

      // Fetch all submissions for this assignment by this student
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

      // Check attempt limits
      const maxAttempts = assignmentData.max_attempts || 1;
      if (completedAttempts >= maxAttempts) {
        toast({
          title: "Hết lượt làm bài",
          description: `Bạn đã sử dụng hết ${maxAttempts} lượt làm bài cho bài này.`,
        });
        navigate(`/class/${classId}/assignment/${assignmentId}`);
        return;
      }

      // Find in-progress submission or create new one
      const inProgressSubmission = (allSubmissionsData || []).find(s => s.status === "in_progress");

      if (inProgressSubmission) {
        setSubmission(inProgressSubmission);
        setCurrentAttempt(inProgressSubmission.attempt_number || completedAttempts + 1);
        if (inProgressSubmission.answers) {
          setAnswers(inProgressSubmission.answers as Record<string, string>);
        }

        // Calculate remaining time
        if (assignmentData.time_limit_minutes) {
          const startTime = new Date(inProgressSubmission.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = assignmentData.time_limit_minutes * 60 - elapsed;
          setTimeLeft(Math.max(0, remaining));
        }
      } else {
        // Create new submission with next attempt number
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

    // Auto-save
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
      // Check if there are essay questions (need manual grading)
      const hasEssayQuestions = questions.some(q => q.question_type === "essay");
      
      // Calculate score for auto-graded questions
      let totalScore = 0;
      let canAutoGrade = true;

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
        } else if (q.question_type === "essay") {
          // Essay questions need manual grading
          canAutoGrade = false;
        }
      });

      // Determine submission status and score
      // If has essay -> status = "submitted", score = null (wait for manual grading)
      // If all auto-gradable -> status = "graded", score = totalScore (immediate result)
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

      // Send notification to teacher
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
          description: "Bài làm đang chờ giáo viên chấm điểm. Điểm sẽ được công bố sau.",
        });
      } else {
        toast({
          title: "Thành công",
          description: autoSubmit 
            ? `Hết giờ! Bài đã được nộp tự động. Điểm: ${totalScore}/${assignment.total_points}`
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{assignment?.title}</h1>
              <p className="text-sm text-muted-foreground">
                Câu {currentIndex + 1}/{questions.length} • Đã trả lời {answeredCount}/{questions.length}
                {(assignment?.max_attempts || 1) > 1 && (
                  <span className="ml-2">• Lần làm: {currentAttempt}/{assignment?.max_attempts}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {assignment?.anti_cheat_enabled && tabSwitchCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Cảnh báo: {tabSwitchCount}
                </Badge>
              )}

              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg ${
                  timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted"
                }`}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeLeft)}
                </div>
              )}

              <Button onClick={() => handleSubmit(false)} disabled={submitting} variant="hero">
                <Send className="h-4 w-4 mr-2" />
                Nộp bài
              </Button>
            </div>
          </div>

          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">Câu {currentIndex + 1}</Badge>
                <Badge variant="secondary">{currentQuestion.points} điểm</Badge>
              </div>
              <CardTitle className="text-xl mt-4">{currentQuestion.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.question_type === "multiple_choice" && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {(currentQuestion.options as unknown as Option[]).map((option, index) => (
                    <div
                      key={option.id}
                      className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion.id] === option.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option.text}
                      </Label>
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
                  <div
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === "true"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer">Đúng</Label>
                  </div>
                  <div
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === "false"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer">Sai</Label>
                  </div>
                </RadioGroup>
              )}

              {currentQuestion.question_type === "short_answer" && (
                <Input
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Nhập câu trả lời..."
                  className="text-lg"
                />
              )}

              {currentQuestion.question_type === "essay" && (
                <Textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Nhập bài làm của bạn..."
                  rows={8}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev - 1)}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Câu trước
            </Button>

            <div className="flex gap-2 flex-wrap justify-center">
              {questions.map((q, i) => (
                <Button
                  key={q.id}
                  variant={i === currentIndex ? "default" : answers[q.id] ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setCurrentIndex(i)}
                  className="w-10 h-10"
                >
                  {i + 1}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev + 1)}
              disabled={currentIndex === questions.length - 1}
            >
              Câu sau
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
