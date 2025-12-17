import { useState, useEffect } from 'react';
import { Plus, Users, MoreVertical, Copy, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { classSchema, getValidationErrors } from '@/lib/validation';

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

const CLASS_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-purple-500 to-purple-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600',
];

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
        .select(`*, class_members(count)`)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const classesWithCount = data?.map(c => ({
        ...c,
        student_count: c.class_members?.[0]?.count || 0
      })) || [];

      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({ title: 'Lỗi', description: 'Không thể tải danh sách lớp học', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const handleCreateClass = async () => {
    // Validate input
    const validationError = getValidationErrors(classSchema, {
      name: newClass.name,
      description: newClass.description || null,
      subject: newClass.subject || null,
    });
    
    if (validationError) {
      toast({ title: 'Lỗi', description: validationError, variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const classCode = generateClassCode();
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: newClass.name, description: newClass.description || null, subject: newClass.subject || null, class_code: classCode, teacher_id: profile.id })
        .select()
        .single();
      if (error) throw error;
      setClasses([{ ...data, student_count: 0 }, ...classes]);
      setNewClass({ name: '', description: '', subject: '' });
      setIsCreateOpen(false);
      toast({ title: 'Thành công', description: `Lớp học "${data.name}" đã được tạo với mã: ${classCode}` });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Không thể tạo lớp học', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyClassCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast({ title: 'Đã sao chép', description: `Mã lớp ${code} đã được sao chép` });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Xin chào, {profile.full_name}
              </h1>
              <p className="text-muted-foreground mt-1">Quản lý lớp học của bạn</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-md">
                  <Plus className="h-5 w-5 mr-2" />
                  Tạo lớp học
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Tạo lớp học mới</DialogTitle>
                  <DialogDescription>Điền thông tin để tạo lớp học. Mã lớp sẽ được tạo tự động.</DialogDescription>
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
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreateClass} disabled={isCreating}>
                    {isCreating ? 'Đang tạo...' : 'Tạo lớp học'}
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
            <h2 className="text-xl font-semibold text-foreground mb-2">Chưa có lớp học nào</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Bắt đầu bằng cách tạo lớp học đầu tiên. Bạn có thể mời học sinh tham gia bằng mã lớp.
            </p>
            <Button size="lg" onClick={() => setIsCreateOpen(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-5 w-5 mr-2" />
              Tạo lớp học đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls, index) => {
              const colorClass = CLASS_COLORS[index % CLASS_COLORS.length];
              return (
                <Link 
                  key={cls.id} 
                  to={`/class/${cls.id}`}
                  className="group block"
                >
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                    {/* Header with gradient */}
                    <div className={`relative h-24 bg-gradient-to-br ${colorClass} p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-lg truncate group-hover:underline">
                            {cls.name}
                          </h3>
                          {cls.subject && (
                            <p className="text-white/80 text-sm truncate">{cls.subject}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem onClick={(e) => copyClassCode(cls.class_code, e as any)}>
                              <Copy className="mr-2 h-4 w-4" /> 
                              Sao chép mã lớp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{cls.student_count} học sinh</span>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {cls.class_code}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            
            {/* Add class card */}
            <Card 
              className="h-full min-h-[180px] border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer flex items-center justify-center"
              onClick={() => setIsCreateOpen(true)}
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-muted-foreground">Tạo lớp học</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
