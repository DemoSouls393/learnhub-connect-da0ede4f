import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Users, 
  Plus, 
  Play, 
  CheckCircle, 
  BarChart3, 
  Eye,
  Settings,
  ListChecks,
  CalendarDays,
  Award,
  AlertCircle,
  BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import QuestionEditor from "@/components/assignment/QuestionEditor";
import QuestionList from "@/components/assignment/QuestionList";
import SubmissionList from "@/components/assignment/SubmissionList";
import GradeStatistics from "@/components/assignment/GradeStatistics";
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
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      const { data: classData } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", classId)
        .single();

      const teacherCheck = classData?.teacher_id === profile?.id;
      setIsTeacher(teacherCheck);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

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
      const maxAttempts = (assignment as any).max_attempts || 1;
      const completedAttempts = mySubmissions.filter(
        s => s.status === "submitted" || s.status === "graded"
      ).length;

      const inProgress = mySubmissions.find(s => s.status === "in_progress");
      if (inProgress) {
        navigate(`/class/${classId}/assignment/${assignmentId}/take`);
        return;
      }

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Không tìm thấy bài tập</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(`/class/${classId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại lớp học
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}`)}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại lớp học
          </Button>

          {/* Header */}
          <div className="bg-card rounded-2xl border shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{assignment.title}</h1>
                    <Badge variant={assignment.is_published ? "default" : "secondary"}>
                      {assignment.is_published ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                    <Badge variant="outline">
                      {assignment.type === "quiz" ? "Trắc nghiệm" : "Bài tập"}
                    </Badge>
                  </div>
                  {assignment.description && (
                    <p className="text-muted-foreground max-w-2xl">{assignment.description}</p>
                  )}
                </div>
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
                    <Button onClick={handleStartQuiz} size="lg" className="bg-gradient-primary shadow-primary hover:opacity-90">
                      <Play className="h-5 w-5 mr-2" />
                      Tiếp tục làm bài
                    </Button>
                  );
                }

                if (completedAttempts === 0) {
                  return (
                    <Button onClick={handleStartQuiz} size="lg" className="bg-gradient-primary shadow-primary hover:opacity-90">
                      <Play className="h-5 w-5 mr-2" />
                      Bắt đầu làm bài
                    </Button>
                  );
                }

                if (!canStartNew) {
                  return (
                    <Button disabled variant="outline" size="lg">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Đã hoàn thành ({completedAttempts}/{maxAttempts})
                    </Button>
                  );
                }

                return null;
              })()}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Số câu hỏi</p>
                    <p className="text-2xl font-bold text-foreground">{questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng điểm</p>
                    <p className="text-2xl font-bold text-foreground">{assignment.total_points}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thời gian</p>
                    <p className="text-2xl font-bold text-foreground">
                      {assignment.time_limit_minutes ? `${assignment.time_limit_minutes}p` : "∞"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đã nộp</p>
                    <p className="text-2xl font-bold text-foreground">
                      {submissions.filter(s => s.status === "submitted" || s.status === "graded").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          {isTeacher ? (
            <Tabs defaultValue="questions" className="space-y-6">
              <div className="bg-card rounded-xl border shadow-sm p-1.5">
                <TabsList className="w-full flex justify-start gap-1 bg-transparent">
                  <TabsTrigger 
                    value="questions" 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <ListChecks className="h-4 w-4" />
                    Câu hỏi ({questions.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="submissions"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Users className="h-4 w-4" />
                    Bài nộp ({submissions.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="statistics"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Thống kê
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Cài đặt
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="questions" className="mt-0">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle>Danh sách câu hỏi</CardTitle>
                      <CardDescription>Quản lý các câu hỏi trong bài tập</CardDescription>
                    </div>
                    <Button onClick={() => setShowQuestionEditor(true)} className="bg-gradient-primary hover:opacity-90">
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

              <TabsContent value="submissions" className="mt-0">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Danh sách bài nộp</CardTitle>
                    <CardDescription>Xem và chấm điểm bài làm của học sinh</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SubmissionList
                      submissions={submissions}
                      totalPoints={assignment.total_points || 100}
                      assignmentId={assignmentId!}
                      assignmentTitle={assignment.title}
                      onUpdate={fetchAssignmentData}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistics" className="mt-0">
                <GradeStatistics
                  submissions={submissions}
                  totalPoints={assignment.total_points || 100}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Cài đặt bài tập</CardTitle>
                    <CardDescription>Cấu hình các tùy chọn cho bài tập</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Hạn nộp</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.due_date
                            ? format(new Date(assignment.due_date), "dd/MM/yyyy HH:mm", { locale: vi })
                            : "Không có hạn"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Cho phép nộp muộn</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.allow_late_submission ? "Có" : "Không"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Xáo trộn câu hỏi</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.shuffle_questions ? "Có" : "Không"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Xáo trộn đáp án</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.shuffle_answers ? "Có" : "Không"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Chống gian lận</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.anti_cheat_enabled ? "Bật" : "Tắt"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Yêu cầu camera</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.camera_required ? "Có" : "Không"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* Student View */
            <div className="grid md:grid-cols-3 gap-6">
              {/* Assignment Info */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Thông tin bài tập</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Hạn nộp</p>
                          <p className="font-medium text-foreground">
                            {assignment.due_date
                              ? format(new Date(assignment.due_date), "dd/MM/yyyy HH:mm", { locale: vi })
                              : "Không có hạn"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Thời gian làm</p>
                          <p className="font-medium text-foreground">
                            {assignment.time_limit_minutes ? `${assignment.time_limit_minutes} phút` : "Không giới hạn"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {assignment.anti_cheat_enabled && (
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-warning">Chế độ chống gian lận</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Bài tập này có bật chống gian lận. Việc chuyển tab hoặc rời khỏi trang sẽ bị ghi nhận.
                              {assignment.camera_required && " Yêu cầu bật camera trong suốt quá trình làm bài."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* My Score */}
                {mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded") && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Kết quả của bạn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10">
                        <div>
                          <p className="text-sm text-muted-foreground">Điểm số</p>
                          <p className="text-3xl font-bold text-foreground">
                            {mySubmission.score !== null ? mySubmission.score : "Chờ chấm"} 
                            <span className="text-lg text-muted-foreground">/{assignment.total_points}</span>
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate(`/class/${classId}/assignment/${assignmentId}/review/${mySubmission.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Xem lại bài làm
                        </Button>
                      </div>
                      
                      {mySubmission.feedback && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium text-foreground mb-1">Nhận xét của giáo viên:</p>
                          <p className="text-sm text-muted-foreground">{mySubmission.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Attempt History */}
              <div>
                <Card className="border-0 shadow-sm sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Lịch sử làm bài</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mySubmissions.length > 0 ? (
                      <div className="space-y-3">
                        {mySubmissions.map((sub, index) => (
                          <div 
                            key={sub.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div>
                              <p className="font-medium text-foreground text-sm">Lần {sub.attempt_number || index + 1}</p>
                              <p className="text-xs text-muted-foreground">
                                {sub.submitted_at 
                                  ? format(new Date(sub.submitted_at), "dd/MM HH:mm", { locale: vi })
                                  : "Đang làm"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {sub.status === "graded" && sub.score !== null ? (
                                <Badge variant="default" className="bg-success">
                                  {sub.score}/{assignment.total_points}
                                </Badge>
                              ) : sub.status === "submitted" ? (
                                <Badge variant="secondary">Chờ chấm</Badge>
                              ) : (
                                <Badge variant="outline">Đang làm</Badge>
                              )}
                              {(sub.status === "graded" || sub.status === "submitted") && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => navigate(`/class/${classId}/assignment/${assignmentId}/review/${sub.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Bạn chưa làm bài tập này
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentDetail;
