import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  ClipboardCheck, 
  FileText, 
  Video, 
  Settings,
  Copy,
  Bell,
  Calendar,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import ClassSettings from '@/components/class/ClassSettings';
import ClassSchedule from '@/components/class/ClassSchedule';
import QuestionBank from '@/components/class/QuestionBank';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  class_code: string;
  teacher_id: string;
  is_active: boolean;
  cover_image: string | null;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [activeTab, setActiveTab] = useState('stream');

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

  const handleClassUpdate = (updates: Partial<ClassData>) => {
    if (classData) {
      setClassData({ ...classData, ...updates });
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

  const defaultCover = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=200&fit=crop';

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

            <div 
              className="relative rounded-2xl overflow-hidden"
              style={{
                backgroundImage: `url(${classData.cover_image || defaultCover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="relative p-6 md:p-8 text-white">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                      {classData.name}
                    </h1>
                    {classData.subject && (
                      <p className="text-white/80">{classData.subject}</p>
                    )}
                    {classData.description && (
                      <p className="text-white/70 text-sm mt-2 max-w-2xl">{classData.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/20 transition-colors"
                      onClick={copyClassCode}
                    >
                      <span className="font-mono font-bold">{classData.class_code}</span>
                      <Copy size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar size={16} />
                Lịch học
              </TabsTrigger>
              {isTeacher && (
                <TabsTrigger value="questions" className="gap-2">
                  <Library size={16} />
                  Ngân hàng câu hỏi
                </TabsTrigger>
              )}
              {isTeacher && (
                <TabsTrigger value="settings" className="gap-2">
                  <Settings size={16} />
                  Cài đặt
                </TabsTrigger>
              )}
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
                classCode={classData.class_code}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <ClassSchedule
                classId={classData.id}
                isTeacher={isTeacher}
              />
            </TabsContent>

            {isTeacher && (
              <TabsContent value="questions">
                <QuestionBank classId={classData.id} />
              </TabsContent>
            )}

            {isTeacher && (
              <TabsContent value="settings">
                <ClassSettings 
                  classData={classData}
                  onUpdate={handleClassUpdate}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}