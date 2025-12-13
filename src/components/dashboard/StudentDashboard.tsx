import { useState, useEffect } from 'react';
import { Plus, Play, Video, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';

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
  teacher: { full_name: string; } | null; 
}

interface ActiveSession { 
  id: string; 
  title: string; 
  class_id: string; 
  class_name: string; 
}

interface StudentDashboardProps { 
  profile: Profile; 
}

const CLASS_COLORS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600',
];

export default function StudentDashboard({ profile }: StudentDashboardProps) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [classCode, setClassCode] = useState('');
  const { toast } = useToast();

  useEffect(() => { 
    fetchData(); 
  }, [profile.id]);

  const fetchData = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', profile.id);
      
      if (!memberships?.length) { 
        setClasses([]); 
        setLoading(false); 
        return; 
      }
      
      const classIds = memberships.map(m => m.class_id);
      
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, description, subject, class_code, teacher_id')
        .in('id', classIds);
      
      const teacherIds = [...new Set(classData?.map(c => c.teacher_id) || [])];
      
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);
      
      const teacherMap = new Map(teacherData?.map(t => [t.id, t]) || []);
      
      setClasses(classData?.map(c => ({ 
        ...c, 
        teacher: teacherMap.get(c.teacher_id) || null 
      })) || []);
      
      // Check for active sessions
      const { data: sessionsData } = await supabase
        .from('live_sessions')
        .select('id, title, class_id')
        .in('class_id', classIds)
        .eq('status', 'live');
      
      if (sessionsData) { 
        const classNameMap = new Map(classData?.map(c => [c.id, c.name]) || []); 
        setActiveSessions(sessionsData.map(s => ({ 
          ...s, 
          class_name: classNameMap.get(s.class_id) || '' 
        }))); 
      }
    } catch (error) { 
      toast({ title: 'Lỗi', description: 'Không thể tải dữ liệu', variant: 'destructive' }); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleJoinClass = async () => {
    if (!classCode.trim()) { 
      toast({ title: 'Lỗi', description: 'Vui lòng nhập mã lớp học', variant: 'destructive' }); 
      return; 
    }
    setIsJoining(true);
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_code', classCode.toUpperCase())
        .maybeSingle();
      
      if (!classData) { 
        toast({ title: 'Không tìm thấy', description: 'Mã lớp học không tồn tại', variant: 'destructive' }); 
        return; 
      }
      
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('student_id', profile.id)
        .maybeSingle();
      
      if (existing) { 
        toast({ title: 'Đã tham gia', description: 'Bạn đã là thành viên của lớp học này', variant: 'destructive' }); 
        return; 
      }
      
      await supabase.from('class_members').insert({ class_id: classData.id, student_id: profile.id });
      
      toast({ title: 'Thành công', description: `Bạn đã tham gia lớp "${classData.name}"` });
      setClassCode(''); 
      setIsJoinOpen(false); 
      fetchData();
    } catch (error: any) { 
      toast({ title: 'Lỗi', description: error.message || 'Không thể tham gia lớp học', variant: 'destructive' }); 
    }
    finally { 
      setIsJoining(false); 
    }
  };

  return (
    <div className="min-h-screen">
      {/* Active Sessions Banner */}
      {activeSessions.length > 0 && (
        <div className="bg-success text-success-foreground">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-medium">Phiên học đang diễn ra</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {activeSessions.map((session) => (
                  <Button 
                    key={session.id}
                    size="sm" 
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => navigate(`/class/${session.class_id}/session/${session.id}`)}
                  >
                    <Play className="h-3 w-3 mr-1" /> 
                    {session.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Xin chào, {profile.full_name}
              </h1>
              <p className="text-muted-foreground mt-1">Lớp học của bạn</p>
            </div>
            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-md">
                  <Plus className="h-5 w-5 mr-2" />
                  Tham gia lớp
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tham gia lớp học</DialogTitle>
                  <DialogDescription>Nhập mã lớp học do giáo viên cung cấp.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="classCode">Mã lớp học</Label>
                  <Input 
                    id="classCode" 
                    placeholder="VD: ABC123" 
                    value={classCode} 
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())} 
                    className="h-14 text-center text-2xl font-mono tracking-[0.3em] mt-2" 
                    maxLength={6} 
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsJoinOpen(false)}>Hủy</Button>
                  <Button onClick={handleJoinClass} disabled={isJoining}>
                    {isJoining ? 'Đang xử lý...' : 'Tham gia'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-[180px] animate-pulse">
                <div className="h-20 bg-muted rounded-t-lg" />
                <CardContent className="pt-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Chưa tham gia lớp học nào</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Nhập mã lớp học do giáo viên cung cấp để bắt đầu học.
            </p>
            <Button size="lg" onClick={() => setIsJoinOpen(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-5 w-5 mr-2" />
              Tham gia lớp học
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls, index) => {
              const colorClass = CLASS_COLORS[index % CLASS_COLORS.length];
              const hasActiveSession = activeSessions.some(s => s.class_id === cls.id);
              
              return (
                <Link 
                  key={cls.id} 
                  to={`/class/${cls.id}`}
                  className="group block"
                >
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                    {/* Header with gradient */}
                    <div className={`relative h-24 bg-gradient-to-br ${colorClass} p-4`}>
                      {hasActiveSession && (
                        <Badge className="absolute top-2 right-2 bg-white/20 text-white border-0 gap-1">
                          <Video className="h-3 w-3" /> Live
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg truncate group-hover:underline">
                          {cls.name}
                        </h3>
                        {cls.subject && (
                          <p className="text-white/80 text-sm truncate">{cls.subject}</p>
                        )}
                      </div>
                      
                      {/* Avatar circle */}
                      <div className="absolute -bottom-6 right-4 w-16 h-16 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-md">
                        <span className="text-xl font-bold text-foreground">
                          {cls.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="pt-4 pb-4">
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground truncate">
                          <span className="font-medium text-foreground">GV:</span> {cls.teacher?.full_name || 'Không xác định'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            
            {/* Join class card */}
            <Card 
              className="h-full min-h-[180px] border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer flex items-center justify-center"
              onClick={() => setIsJoinOpen(true)}
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-muted-foreground">Tham gia lớp</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
