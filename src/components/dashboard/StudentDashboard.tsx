import { useState, useEffect } from 'react';
import { Plus, BookOpen, ClipboardCheck, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'teacher' | 'student';
}

interface ClassWithTeacher {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  class_code: string;
  teacher: {
    full_name: string;
  } | null;
}

interface StudentDashboardProps {
  profile: Profile;
}

export default function StudentDashboard({ profile }: StudentDashboardProps) {
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [classCode, setClassCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, [profile.id]);

  const fetchClasses = async () => {
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', profile.id);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      const classIds = memberships.map(m => m.class_id);
      
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          description,
          subject,
          class_code,
          teacher_id
        `)
        .in('id', classIds);

      if (classError) throw classError;

      // Fetch teacher info separately
      const teacherIds = [...new Set(classData?.map(c => c.teacher_id) || [])];
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);

      const teacherMap = new Map(teacherData?.map(t => [t.id, t]) || []);

      const classesWithTeachers = classData?.map(c => ({
        ...c,
        teacher: teacherMap.get(c.teacher_id) || null
      })) || [];

      setClasses(classesWithTeachers);
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

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập mã lớp học',
        variant: 'destructive',
      });
      return;
    }

    setIsJoining(true);
    try {
      // Find class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_code', classCode.toUpperCase())
        .maybeSingle();

      if (classError) throw classError;

      if (!classData) {
        toast({
          title: 'Không tìm thấy',
          description: 'Mã lớp học không tồn tại',
          variant: 'destructive',
        });
        return;
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Đã tham gia',
          description: 'Bạn đã là thành viên của lớp học này',
          variant: 'destructive',
        });
        return;
      }

      // Join class
      const { error: joinError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          student_id: profile.id,
        });

      if (joinError) throw joinError;

      toast({
        title: 'Thành công',
        description: `Bạn đã tham gia lớp "${classData.name}"`,
      });

      setClassCode('');
      setIsJoinOpen(false);
      fetchClasses();
    } catch (error: any) {
      console.error('Error joining class:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tham gia lớp học',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const stats = [
    { label: 'Lớp học', value: classes.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Bài tập', value: 0, icon: ClipboardCheck, color: 'bg-warning/10 text-warning' },
    { label: 'Hoàn thành', value: 0, icon: CheckCircle, color: 'bg-success/10 text-success' },
    { label: 'Đang chờ', value: 0, icon: Clock, color: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">
          Xin chào, {profile.full_name}! 👋
        </h1>
        <p className="text-muted-foreground">
          Tiếp tục hành trình học tập của bạn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
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
          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus size={18} />
                Tham gia lớp
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tham gia lớp học</DialogTitle>
                <DialogDescription>
                  Nhập mã lớp học do giáo viên cung cấp để tham gia.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="classCode">Mã lớp học</Label>
                  <Input
                    id="classCode"
                    placeholder="VD: ABC123"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsJoinOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleJoinClass} disabled={isJoining}>
                  {isJoining ? 'Đang xử lý...' : 'Tham gia'}
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
              <h3 className="text-lg font-semibold mb-2">Chưa tham gia lớp học nào</h3>
              <p className="text-muted-foreground mb-4">
                Nhập mã lớp học để tham gia lớp đầu tiên
              </p>
              <Button onClick={() => setIsJoinOpen(true)}>
                <Plus size={18} />
                Tham gia lớp
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
                  <CardTitle className="text-lg">
                    <Link to={`/class/${cls.id}`} className="hover:text-primary transition-colors">
                      {cls.name}
                    </Link>
                  </CardTitle>
                  {cls.subject && (
                    <CardDescription>{cls.subject}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    GV: {cls.teacher?.full_name || 'Không xác định'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Sắp đến hạn</h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-2" size={32} />
            <p>Không có bài tập nào sắp đến hạn</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}