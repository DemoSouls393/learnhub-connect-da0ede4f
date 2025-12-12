import { useState, useEffect } from 'react';
import { Plus, Users, BookOpen, ClipboardCheck, Video, Calendar, MoreVertical, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'teacher' | 'student';
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  class_code: string;
  cover_image: string | null;
  created_at: string;
  student_count?: number;
}

interface TeacherDashboardProps {
  profile: Profile;
}

export default function TeacherDashboard({ profile }: TeacherDashboardProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '', subject: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, [profile.id]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_members(count)
        `)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const classesWithCount = data?.map(c => ({
        ...c,
        student_count: c.class_members?.[0]?.count || 0
      })) || [];

      setClasses(classesWithCount);

      // Fetch assignments count
      if (classesWithCount.length > 0) {
        const classIds = classesWithCount.map(c => c.id);
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('id')
          .in('class_id', classIds);

        const { data: sessionsData } = await supabase
          .from('live_sessions')
          .select('id')
          .in('class_id', classIds);

        setStats(prev => ({
          ...prev,
          assignments: assignmentsData?.length || 0,
          sessions: sessionsData?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách lớp học',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const [stats, setStats] = useState({
    assignments: 0,
    sessions: 0,
  });

  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateClass = async () => {
    if (!newClass.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên lớp học',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const classCode = generateClassCode();
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          description: newClass.description || null,
          subject: newClass.subject || null,
          class_code: classCode,
          teacher_id: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClasses([{ ...data, student_count: 0 }, ...classes]);
      setNewClass({ name: '', description: '', subject: '' });
      setIsCreateOpen(false);
      
      toast({
        title: 'Thành công',
        description: `Lớp học "${data.name}" đã được tạo với mã: ${classCode}`,
      });
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo lớp học',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Đã sao chép',
      description: `Mã lớp ${code} đã được sao chép`,
    });
  };

  const statsData = [
    { label: 'Lớp học', value: classes.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Học sinh', value: classes.reduce((acc, c) => acc + (c.student_count || 0), 0), icon: Users, color: 'bg-accent/10 text-accent' },
    { label: 'Bài tập', value: stats.assignments, icon: ClipboardCheck, color: 'bg-warning/10 text-warning' },
    { label: 'Buổi học', value: stats.sessions, icon: Video, color: 'bg-success/10 text-success' },
  ];

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">
          Xin chào, {profile.full_name}! 👋
        </h1>
        <p className="text-muted-foreground">
          Quản lý lớp học và theo dõi tiến độ học sinh của bạn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsData.map((stat, index) => (
          <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Classes Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Lớp học của bạn</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus size={18} />
                Tạo lớp mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo lớp học mới</DialogTitle>
                <DialogDescription>
                  Điền thông tin để tạo lớp học. Mã lớp sẽ được tạo tự động.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Tên lớp học *</Label>
                  <Input
                    id="className"
                    placeholder="VD: Toán 12A1"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Môn học</Label>
                  <Input
                    id="subject"
                    placeholder="VD: Toán học"
                    value={newClass.subject}
                    onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả về lớp học..."
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateClass} disabled={isCreating}>
                  {isCreating ? 'Đang tạo...' : 'Tạo lớp học'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-semibold mb-2">Chưa có lớp học nào</h3>
              <p className="text-muted-foreground mb-4">
                Tạo lớp học đầu tiên để bắt đầu giảng dạy
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus size={18} />
                Tạo lớp mới
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls, index) => (
              <Card 
                key={cls.id} 
                className="card-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        <Link to={`/class/${cls.id}`} className="hover:text-primary transition-colors">
                          {cls.name}
                        </Link>
                      </CardTitle>
                      {cls.subject && (
                        <CardDescription>{cls.subject}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyClassCode(cls.class_code)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Sao chép mã lớp
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/class/${cls.id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users size={14} />
                      <span>{cls.student_count} học sinh</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs">
                      {cls.class_code}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Hành động nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Video size={24} className="text-primary" />
            <span>Tạo buổi học</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <ClipboardCheck size={24} className="text-accent" />
            <span>Tạo bài tập</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Calendar size={24} className="text-warning" />
            <span>Lên lịch</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Users size={24} className="text-success" />
            <span>Mời học sinh</span>
          </Button>
        </div>
      </div>
    </div>
  );
}