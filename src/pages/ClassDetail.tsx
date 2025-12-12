import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  ClipboardCheck, 
  FileText, 
  Video, 
  Settings,
  Plus,
  Copy,
  Bell,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import ClassStream from '@/components/class/ClassStream';
import ClassMembers from '@/components/class/ClassMembers';
import ClassAssignments from '@/components/class/ClassAssignments';
import ClassMaterials from '@/components/class/ClassMaterials';
import LiveSessionManager from '@/components/class/LiveSessionManager';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  class_code: string;
  teacher_id: string;
  is_active: boolean;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (id && profile) {
      fetchClassData();
    }
  }, [id, user, profile, authLoading, navigate]);

  const fetchClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setClassData(data);
      setIsTeacher(data.teacher_id === profile?.id);
    } catch (error) {
      console.error('Error fetching class:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin lớp học',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyClassCode = () => {
    if (classData) {
      navigator.clipboard.writeText(classData.class_code);
      toast({
        title: 'Đã sao chép',
        description: `Mã lớp ${classData.class_code} đã được sao chép`,
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!classData || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/dashboard">
                <ArrowLeft size={18} />
                Quay lại Dashboard
              </Link>
            </Button>

            <div className="bg-gradient-hero rounded-2xl p-6 md:p-8 text-primary-foreground">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                    {classData.name}
                  </h1>
                  {classData.subject && (
                    <p className="text-primary-foreground/80">{classData.subject}</p>
                  )}
                  {classData.description && (
                    <p className="text-primary-foreground/70 text-sm mt-2">{classData.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm cursor-pointer hover:bg-primary-foreground/20 transition-colors"
                    onClick={copyClassCode}
                  >
                    <span className="font-mono font-bold">{classData.class_code}</span>
                    <Copy size={16} />
                  </div>
                  {isTeacher && (
                    <Button variant="secondary" size="icon">
                      <Settings size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="stream" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="stream" className="gap-2">
                <Bell size={16} />
                Bảng tin
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                <Video size={16} />
                Phiên học
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <ClipboardCheck size={16} />
                Bài tập
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <FileText size={16} />
                Tài liệu
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users size={16} />
                Thành viên
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stream">
              <ClassStream 
                classId={classData.id} 
                isTeacher={isTeacher} 
                profileId={profile.id}
              />
            </TabsContent>

            <TabsContent value="live">
              <LiveSessionManager
                classId={classData.id}
                isTeacher={isTeacher}
              />
            </TabsContent>

            <TabsContent value="assignments">
              <ClassAssignments 
                classId={classData.id} 
                isTeacher={isTeacher}
              />
            </TabsContent>

            <TabsContent value="materials">
              <ClassMaterials 
                classId={classData.id} 
                isTeacher={isTeacher}
              />
            </TabsContent>

            <TabsContent value="members">
              <ClassMembers 
                classId={classData.id} 
                isTeacher={isTeacher}
                teacherId={classData.teacher_id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}