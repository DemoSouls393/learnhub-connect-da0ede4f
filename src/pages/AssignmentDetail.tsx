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
type Submission = Tables<"submissions">;

const AssignmentDetail = () => {
  const { classId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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

      // Fetch submissions (for teacher) or my submission (for student)
      if (teacherCheck) {
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*, profiles:student_id(full_name, email)")
          .eq("assignment_id", assignmentId);
        setSubmissions(submissionsData || []);
      } else {
        const { data: mySubmissionData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", profile?.id)
          .maybeSingle();
        setMySubmission(mySubmissionData);
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
    if (!profile || !assignmentId) return;

    try {
      // Check if already has submission
      if (mySubmission) {
        navigate(`/class/${classId}/assignment/${assignmentId}/take`);
        return;
      }

      // Create new submission
      const { data, error } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: profile.id,
          status: "in_progress",
        })
        .select()
        .single();

      if (error) throw error;

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

            {!isTeacher && assignment.is_published && (
              <Button onClick={handleStartQuiz} variant="hero">
                {mySubmission ? (
                  mySubmission.status === "submitted" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Đã nộp
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Tiếp tục làm bài
                    </>
                  )
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Bắt đầu làm bài
                  </>
                )}
              </Button>
            )}
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

              {mySubmission && mySubmission.status === "submitted" && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <p className="font-medium text-success">Bạn đã nộp bài</p>
                  {mySubmission.score !== null && (
                    <p className="text-lg font-bold mt-1">
                      Điểm: {mySubmission.score}/{assignment.total_points}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
