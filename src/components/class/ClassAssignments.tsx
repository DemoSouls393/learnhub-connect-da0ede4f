import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardCheck, Clock, Calendar, Eye, Edit, Trash2, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { notifyNewAssignment } from '@/lib/notifications';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: string;
  due_date: string | null;
  total_points: number;
  is_published: boolean;
  created_at: string;
  time_limit_minutes: number | null;
  anti_cheat_enabled: boolean;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
}

interface ClassAssignmentsProps {
  classId: string;
  isTeacher: boolean;
}

export default function ClassAssignments({ classId, isTeacher }: ClassAssignmentsProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    type: 'quiz',
    due_date: '',
    total_points: 100,
    time_limit_minutes: 30,
    max_attempts: 1,
    anti_cheat_enabled: true,
    shuffle_questions: true,
    shuffle_answers: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, [classId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssignments(data || []);

      // Fetch student's submissions if not teacher
      if (!isTeacher && profile) {
        const assignmentIds = (data || []).map(a => a.id);
        if (assignmentIds.length > 0) {
          const { data: submissionsData } = await supabase
            .from('submissions')
            .select('id, assignment_id, status, score')
            .eq('student_id', profile.id)
            .in('assignment_id', assignmentIds);

          if (submissionsData) {
            const submissionsMap: Record<string, Submission> = {};
            submissionsData.forEach(s => {
              submissionsMap[s.assignment_id] = {
                id: s.id,
                status: s.status,
                score: s.score,
              };
            });
            setSubmissions(submissionsMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAssignment.title.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề bài tập',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          title: newAssignment.title,
          description: newAssignment.description || null,
          type: newAssignment.type,
          due_date: newAssignment.due_date || null,
          total_points: newAssignment.total_points,
          time_limit_minutes: newAssignment.time_limit_minutes || null,
          max_attempts: newAssignment.max_attempts || 1,
          anti_cheat_enabled: newAssignment.anti_cheat_enabled,
          shuffle_questions: newAssignment.shuffle_questions,
          shuffle_answers: newAssignment.shuffle_answers,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;

      setNewAssignment({
        title: '',
        description: '',
        type: 'quiz',
        due_date: '',
        total_points: 100,
        time_limit_minutes: 30,
        max_attempts: 1,
        anti_cheat_enabled: true,
        shuffle_questions: true,
        shuffle_answers: true,
      });
      setIsCreateOpen(false);
      toast({
        title: 'Thành công',
        description: 'Bài tập đã được tạo. Bấm vào để thêm câu hỏi.',
      });
      // Navigate to assignment detail to add questions
      navigate(`/class/${classId}/assignment/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo bài tập',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePublish = async (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    try {
      const willPublish = !assignment.is_published;
      
      const { error } = await supabase
        .from('assignments')
        .update({ is_published: willPublish })
        .eq('id', assignment.id);

      if (error) throw error;

      setAssignments(assignments.map(a => 
        a.id === assignment.id ? { ...a, is_published: willPublish } : a
      ));

      // If publishing, notify all students in the class
      if (willPublish) {
        // Get class info and students
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', classId)
          .single();
        
        const { data: members } = await supabase
          .from('class_members')
          .select('student_id')
          .eq('class_id', classId);

        if (members && classData) {
          // Send notification to each student
          for (const member of members) {
            await notifyNewAssignment(
              member.student_id,
              assignment.title,
              classData.name,
              classId,
              assignment.id
            );
          }
        }
      }

      toast({
        title: 'Thành công',
        description: assignment.is_published ? 'Đã ẩn bài tập' : 'Đã công bố bài tập và thông báo cho học sinh',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa bài tập này? Tất cả câu hỏi và bài nộp sẽ bị xóa.')) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(assignments.filter(a => a.id !== assignmentId));
      toast({
        title: 'Thành công',
        description: 'Đã xóa bài tập',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssignmentClick = (assignment: Assignment) => {
    if (isTeacher) {
      navigate(`/class/${classId}/assignment/${assignment.id}`);
    } else if (assignment.is_published) {
      const submission = submissions[assignment.id];
      if (submission?.status === 'submitted') {
        // View result
        navigate(`/class/${classId}/assignment/${assignment.id}`);
      } else {
        // Start or continue quiz
        navigate(`/class/${classId}/assignment/${assignment.id}/take`);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assignment': return 'Bài tập';
      case 'quiz': return 'Trắc nghiệm';
      case 'exam': return 'Bài kiểm tra';
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'assignment': return 'default';
      case 'quiz': return 'secondary';
      case 'exam': return 'destructive';
      default: return 'default';
    }
  };

  const getSubmissionStatus = (assignmentId: string) => {
    const submission = submissions[assignmentId];
    if (!submission) return null;

    if (submission.status === 'submitted') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã nộp
          </Badge>
          {submission.score !== null && (
            <span className="font-semibold text-green-600">
              {submission.score} điểm
            </span>
          )}
        </div>
      );
    } else if (submission.status === 'in_progress') {
      return (
        <Badge variant="outline" className="text-orange-500 border-orange-500">
          <Clock className="h-3 w-3 mr-1" />
          Đang làm
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  // Filter assignments for students (only published)
  const displayAssignments = isTeacher 
    ? assignments 
    : assignments.filter(a => a.is_published);

  return (
    <div className="space-y-4">
      {/* Create Button for Teachers */}
      {isTeacher && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus size={18} />
              Tạo bài tập mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo bài tập mới</DialogTitle>
              <DialogDescription>
                Điền thông tin để tạo bài tập hoặc bài kiểm tra mới.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  placeholder="VD: Bài kiểm tra Chương 1"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Loại</Label>
                <Select
                  value={newAssignment.type}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Trắc nghiệm</SelectItem>
                    <SelectItem value="assignment">Bài tập</SelectItem>
                    <SelectItem value="exam">Bài kiểm tra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả về bài tập..."
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Hạn nộp</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_limit">Thời gian làm bài (phút)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={newAssignment.time_limit_minutes}
                    onChange={(e) => setNewAssignment({ ...newAssignment, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points">Điểm tối đa</Label>
                  <Input
                    id="points"
                    type="number"
                    value={newAssignment.total_points}
                    onChange={(e) => setNewAssignment({ ...newAssignment, total_points: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Số lần làm bài</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    min={1}
                    value={newAssignment.max_attempts}
                    onChange={(e) => setNewAssignment({ ...newAssignment, max_attempts: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Cài đặt nâng cao</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Chống gian lận</Label>
                    <p className="text-sm text-muted-foreground">Phát hiện chuyển tab</p>
                  </div>
                  <Switch
                    checked={newAssignment.anti_cheat_enabled}
                    onCheckedChange={(checked) => setNewAssignment({ ...newAssignment, anti_cheat_enabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Xáo trộn câu hỏi</Label>
                    <p className="text-sm text-muted-foreground">Mỗi học sinh nhận thứ tự câu hỏi khác nhau</p>
                  </div>
                  <Switch
                    checked={newAssignment.shuffle_questions}
                    onCheckedChange={(checked) => setNewAssignment({ ...newAssignment, shuffle_questions: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Xáo trộn đáp án</Label>
                    <p className="text-sm text-muted-foreground">Thứ tự đáp án sẽ khác nhau</p>
                  </div>
                  <Switch
                    checked={newAssignment.shuffle_answers}
                    onCheckedChange={(checked) => setNewAssignment({ ...newAssignment, shuffle_answers: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Đang tạo...' : 'Tạo và thêm câu hỏi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Assignments List */}
      {displayAssignments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardCheck className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="text-lg font-semibold mb-2">Chưa có bài tập nào</h3>
            <p className="text-muted-foreground">
              {isTeacher ? 'Tạo bài tập đầu tiên cho lớp học' : 'Giáo viên chưa giao bài tập'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayAssignments.map((assignment) => (
            <Card 
              key={assignment.id} 
              className="card-hover cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleAssignmentClick(assignment)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <Badge variant={getTypeBadgeVariant(assignment.type)}>
                        {getTypeLabel(assignment.type)}
                      </Badge>
                      {!assignment.is_published && isTeacher && (
                        <Badge variant="outline">Bản nháp</Badge>
                      )}
                    </div>
                    {assignment.description && (
                      <CardDescription>{assignment.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isTeacher && getSubmissionStatus(assignment.id)}
                    {isTeacher && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => togglePublish(e, assignment)}
                        >
                          {assignment.is_published ? 'Ẩn' : 'Công bố'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(e, assignment.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <ClipboardCheck size={14} />
                    <span>{assignment.total_points} điểm</span>
                  </div>
                  {assignment.time_limit_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{assignment.time_limit_minutes} phút</span>
                    </div>
                  )}
                  {assignment.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Hạn: {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                    </div>
                  )}
                  {!isTeacher && !submissions[assignment.id] && (
                    <Button size="sm" variant="hero" className="ml-auto" onClick={(e) => e.stopPropagation()}>
                      <Play size={14} className="mr-1" />
                      Làm bài
                    </Button>
                  )}
                  {isTeacher && (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={(e) => e.stopPropagation()}>
                      <Eye size={14} className="mr-1" />
                      Chi tiết
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}