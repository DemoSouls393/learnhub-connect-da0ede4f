import { useState, useEffect } from 'react';
import { Plus, ClipboardCheck, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: string;
  due_date: string | null;
  total_points: number;
  is_published: boolean;
  created_at: string;
}

interface ClassAssignmentsProps {
  classId: string;
  isTeacher: boolean;
}

export default function ClassAssignments({ classId, isTeacher }: ClassAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    type: 'assignment',
    due_date: '',
    total_points: 100,
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
      const { error } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          title: newAssignment.title,
          description: newAssignment.description || null,
          type: newAssignment.type,
          due_date: newAssignment.due_date || null,
          total_points: newAssignment.total_points,
          is_published: false,
        });

      if (error) throw error;

      setNewAssignment({ title: '', description: '', type: 'assignment', due_date: '', total_points: 100 });
      setIsCreateOpen(false);
      fetchAssignments();
      toast({
        title: 'Thành công',
        description: 'Bài tập đã được tạo',
      });
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

  const togglePublish = async (assignment: Assignment) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ is_published: !assignment.is_published })
        .eq('id', assignment.id);

      if (error) throw error;

      setAssignments(assignments.map(a => 
        a.id === assignment.id ? { ...a, is_published: !a.is_published } : a
      ));

      toast({
        title: 'Thành công',
        description: assignment.is_published ? 'Đã ẩn bài tập' : 'Đã công bố bài tập',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
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

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'assignment': return 'default';
      case 'quiz': return 'secondary';
      case 'exam': return 'destructive';
      default: return 'default';
    }
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
          <DialogContent>
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
                  placeholder="VD: Bài tập Chương 1"
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
                    <SelectItem value="assignment">Bài tập</SelectItem>
                    <SelectItem value="quiz">Trắc nghiệm</SelectItem>
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
                  <Label htmlFor="points">Điểm tối đa</Label>
                  <Input
                    id="points"
                    type="number"
                    value={newAssignment.total_points}
                    onChange={(e) => setNewAssignment({ ...newAssignment, total_points: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Đang tạo...' : 'Tạo bài tập'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
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
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <Badge variant={getTypeBadgeVariant(assignment.type) as any}>
                        {getTypeLabel(assignment.type)}
                      </Badge>
                      {!assignment.is_published && (
                        <Badge variant="outline">Nháp</Badge>
                      )}
                    </div>
                    {assignment.description && (
                      <CardDescription>{assignment.description}</CardDescription>
                    )}
                  </div>
                  {isTeacher && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(assignment)}
                    >
                      {assignment.is_published ? 'Ẩn' : 'Công bố'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ClipboardCheck size={14} />
                    <span>{assignment.total_points} điểm</span>
                  </div>
                  {assignment.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Hạn: {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                    </div>
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