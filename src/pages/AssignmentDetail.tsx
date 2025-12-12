import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, FileText, Users, Plus, Play, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import QuestionEditor from "@/components/assignment/QuestionEditor";
import QuestionList from "@/components/assignment/QuestionList";
import SubmissionList from "@/components/assignment/SubmissionList";
import type { Tables } from "@/integrations/supabase/types";

type Assignment = Tables<"assignments">;
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
  attempt_number?: number;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AssignmentDetail = () => {
  const { classId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);

  useEffect(() => {
    if (assignmentId && profile) {
      fetchAssignmentData();
    }
  }, [assignmentId, profile]);

  const fetchAssignmentData = async () => {
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Check if user is teacher
      const { data: classData } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", classId)
        .single();

      const teacherCheck = classData?.teacher_id === profile?.id;
      setIsTeacher(teacherCheck);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch submissions (for teacher) or my submissions (for student)
      if (teacherCheck) {
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("id, student_id, status, score, feedback, submitted_at, started_at, answers, attempt_number, profiles:student_id(full_name, email)")
          .eq("assignment_id", assignmentId);
        const mappedSubmissions: Submission[] = (submissionsData || []).map((s) => ({
          id: s.id,
          student_id: s.student_id,
          status: s.status,
          score: s.score,
          feedback: s.feedback,
          submitted_at: s.submitted_at,
          started_at: s.started_at,
          answers: s.answers as Record<string, string> | null,
          attempt_number: s.attempt_number,
          profiles: s.profiles as { full_name: string; email: string } | undefined,
        }));
        setSubmissions(mappedSubmissions);
      } else {
        // Fetch ALL submissions for this student (for attempt history)
        const { data: allMySubmissions } = await supabase
          .from("submissions")
          .select("id, student_id, status, score, feedback, submitted_at, started_at, answers, attempt_number")
          .eq("assignment_id", assignmentId)
          .eq("student_id", profile?.id)
          .order("attempt_number", { ascending: true });

        if (allMySubmissions && allMySubmissions.length > 0) {
          const mappedSubmissions: Submission[] = allMySubmissions.map(s => ({
            id: s.id,
            student_id: s.student_id,
            status: s.status,
            score: s.score,
            feedback: s.feedback,
            submitted_at: s.submitted_at,
            started_at: s.started_at,
            answers: s.answers as Record<string, string> | null,
            attempt_number: s.attempt_number,
          }));
          setMySubmissions(mappedSubmissions);
          
          // Set the latest graded/submitted as main or the in-progress one
          const latestCompleted = mappedSubmissions
            .filter(s => s.status === "submitted" || s.status === "graded")
            .sort((a, b) => (b.attempt_number || 0) - (a.attempt_number || 0))[0];
          const inProgress = mappedSubmissions.find(s => s.status === "in_progress");
          
          setMySubmission(latestCompleted || inProgress || null);
        } else {
          setMySubmissions([]);
          setMySubmission(null);
        }
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin bài tập",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!profile || !assignmentId || !assignment) return;

    try {
      // Check attempt limits
      const maxAttempts = (assignment as any).max_attempts || 1;
      const completedAttempts = mySubmissions.filter(
        s => s.status === "submitted" || s.status === "graded"
      ).length;

      // If there's an in-progress submission, continue it
      const inProgress = mySubmissions.find(s => s.status === "in_progress");
      if (inProgress) {
        navigate(`/class/${classId}/assignment/${assignmentId}/take`);
        return;
      }

      // Check if max attempts reached
      if (completedAttempts >= maxAttempts) {
        toast({
          title: "Hết lượt làm bài",
          description: `Bạn đã sử dụng hết ${maxAttempts} lượt làm bài.`,
          variant: "destructive",
        });
        return;
      }

      navigate(`/class/${classId}/assignment/${assignmentId}/take`);
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast({
        title: "Lỗi",
        description: "Không thể bắt đầu làm bài",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy bài tập</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại lớp học
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{assignment.title}</h1>
                <Badge variant={assignment.is_published ? "default" : "secondary"}>
                  {assignment.is_published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                <Badge variant="outline">{assignment.type === "quiz" ? "Trắc nghiệm" : "Bài tập"}</Badge>
              </div>
              {assignment.description && (
                <p className="text-muted-foreground">{assignment.description}</p>
              )}
            </div>

            {!isTeacher && assignment.is_published && (() => {
              const maxAttempts = (assignment as any).max_attempts || 1;
              const completedAttempts = mySubmissions.filter(
                s => s.status === "submitted" || s.status === "graded"
              ).length;
              const hasInProgress = mySubmissions.some(s => s.status === "in_progress");
              const canStartNew = completedAttempts < maxAttempts;

              if (hasInProgress) {
                return (
                  <Button onClick={handleStartQuiz} variant="hero">
                    <Play className="h-4 w-4 mr-2" />
                    Tiếp tục làm bài
                  </Button>
                );
              }

              if (completedAttempts === 0) {
                return (
                  <Button onClick={handleStartQuiz} variant="hero">
                    <Play className="h-4 w-4 mr-2" />
                    Bắt đầu làm bài
                  </Button>
                );
              }

              if (!canStartNew) {
                return (
                  <Button disabled variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Đã hoàn thành ({completedAttempts}/{maxAttempts} lượt)
                  </Button>
                );
              }

              return null;
            })()}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số câu hỏi</p>
                  <p className="text-xl font-bold">{questions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng điểm</p>
                  <p className="text-xl font-bold">{assignment.total_points}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Thời gian</p>
                  <p className="text-xl font-bold">
                    {assignment.time_limit_minutes ? `${assignment.time_limit_minutes} phút` : "Không giới hạn"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã nộp</p>
                  <p className="text-xl font-bold">{submissions.filter(s => s.status === "submitted").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        {isTeacher ? (
          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="questions">Câu hỏi ({questions.length})</TabsTrigger>
              <TabsTrigger value="submissions">Bài nộp ({submissions.length})</TabsTrigger>
              <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            </TabsList>

            <TabsContent value="questions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Danh sách câu hỏi</CardTitle>
                  <Button onClick={() => setShowQuestionEditor(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm câu hỏi
                  </Button>
                </CardHeader>
                <CardContent>
                  <QuestionList
                    questions={questions}
                    onUpdate={fetchAssignmentData}
                    assignmentId={assignmentId!}
                  />
                </CardContent>
              </Card>

              {showQuestionEditor && (
                <QuestionEditor
                  assignmentId={assignmentId!}
                  orderIndex={questions.length}
                  onClose={() => setShowQuestionEditor(false)}
                  onSave={() => {
                    setShowQuestionEditor(false);
                    fetchAssignmentData();
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="submissions">
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách bài nộp</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubmissionList
                    submissions={submissions}
                    totalPoints={assignment.total_points || 100}
                    assignmentId={assignmentId!}
                    onUpdate={fetchAssignmentData}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt bài tập</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Hạn nộp</p>
                      <p className="text-muted-foreground">
                        {assignment.due_date
                          ? format(new Date(assignment.due_date), "dd/MM/yyyy HH:mm", { locale: vi })
                          : "Không có hạn"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cho phép nộp muộn</p>
                      <p className="text-muted-foreground">
                        {assignment.allow_late_submission ? "Có" : "Không"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Xáo trộn câu hỏi</p>
                      <p className="text-muted-foreground">
                        {assignment.shuffle_questions ? "Có" : "Không"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Xáo trộn đáp án</p>
                      <p className="text-muted-foreground">
                        {assignment.shuffle_answers ? "Có" : "Không"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Chống gian lận</p>
                      <p className="text-muted-foreground">
                        {assignment.anti_cheat_enabled ? "Bật" : "Tắt"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Yêu cầu camera</p>
                      <p className="text-muted-foreground">
                        {assignment.camera_required ? "Có" : "Không"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Thông tin bài tập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Hạn nộp</p>
                  <p className="text-muted-foreground">
                    {assignment.due_date
                      ? format(new Date(assignment.due_date), "dd/MM/yyyy HH:mm", { locale: vi })
                      : "Không có hạn"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Thời gian làm bài</p>
                  <p className="text-muted-foreground">
                    {assignment.time_limit_minutes ? `${assignment.time_limit_minutes} phút` : "Không giới hạn"}
                  </p>
                </div>
              </div>

              {/* Attempt info and history */}
              {(() => {
                const maxAttempts = (assignment as any).max_attempts || 1;
                const completedAttempts = mySubmissions.filter(
                  s => s.status === "submitted" || s.status === "graded"
                ).length;
                const hasInProgress = mySubmissions.some(s => s.status === "in_progress");
                const canStartNew = completedAttempts < maxAttempts && !hasInProgress;

                return (
                  <>
                    {maxAttempts > 1 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Số lần làm bài: {completedAttempts}/{maxAttempts}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {canStartNew 
                            ? `Còn ${maxAttempts - completedAttempts} lượt làm bài`
                            : hasInProgress 
                              ? "Đang có bài làm dở"
                              : "Đã hết lượt làm bài"}
                        </p>
                      </div>
                    )}

                    {/* Show result for latest submission */}
                    {mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded") && (
                      <div className={`p-4 rounded-lg border ${
                        mySubmission.status === "graded" 
                          ? "bg-success/10 border-success/20" 
                          : "bg-muted border-border"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${mySubmission.status === "graded" ? "text-success" : "text-muted-foreground"}`}>
                              {mySubmission.status === "graded" ? "Đã chấm điểm" : "Đang chờ chấm điểm"}
                              {mySubmission.attempt_number && maxAttempts > 1 && (
                                <span className="text-xs ml-2">(Lần {mySubmission.attempt_number})</span>
                              )}
                            </p>
                            {mySubmission.submitted_at && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Nộp lúc: {format(new Date(mySubmission.submitted_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                              </p>
                            )}
                          </div>
                          {mySubmission.status === "graded" && mySubmission.score !== null && (
                            <div className="text-right">
                              <p className="text-3xl font-bold text-success">
                                {mySubmission.score}/{assignment.total_points}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((mySubmission.score / (assignment.total_points || 100)) * 100)}%
                              </p>
                            </div>
                          )}
                          {mySubmission.status === "submitted" && mySubmission.score === null && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Chờ giáo viên chấm
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show feedback if available */}
                        {mySubmission.feedback && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-1">Nhận xét của giáo viên:</p>
                            <p className="text-muted-foreground">{mySubmission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attempt history */}
                    {mySubmissions.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Lịch sử làm bài</p>
                        <div className="space-y-2">
                          {mySubmissions
                            .filter(s => s.status === "submitted" || s.status === "graded")
                            .map((sub, index) => (
                              <div 
                                key={sub.id} 
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                              >
                                <div>
                                  <span className="font-medium">Lần {sub.attempt_number || index + 1}</span>
                                  {sub.submitted_at && (
                                    <span className="text-muted-foreground ml-2">
                                      {format(new Date(sub.submitted_at), "dd/MM HH:mm", { locale: vi })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {sub.status === "graded" && sub.score !== null ? (
                                    <Badge variant={sub.score >= (assignment.total_points || 100) * 0.5 ? "default" : "destructive"}>
                                      {sub.score}/{assignment.total_points}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Chờ chấm</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Start new attempt button */}
                    {canStartNew && completedAttempts > 0 && (
                      <Button onClick={handleStartQuiz} variant="outline" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Làm lại (Lần {completedAttempts + 1})
                      </Button>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
