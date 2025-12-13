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
  Library,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!classData || !profile) {
    return null;
  }

  const defaultCover = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            asChild 
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại Dashboard
            </Link>
          </Button>

          {/* Header Card */}
          <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg">
            {/* Cover Image */}
            <div 
              className="h-48 md:h-56 bg-cover bg-center"
              style={{
                backgroundImage: `url(${classData.cover_image || defaultCover})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />
            </div>
            
            {/* Content */}
            <div className="relative px-6 pb-6 -mt-16">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                {/* Class Info */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <GraduationCap className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-1">
                      {classData.name}
                    </h1>
                    {classData.subject && (
                      <p className="text-primary-foreground/80 text-lg">{classData.subject}</p>
                    )}
                    {classData.description && (
                      <p className="text-primary-foreground/70 text-sm mt-1 max-w-2xl line-clamp-2">
                        {classData.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Class Code */}
                <div 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/95 backdrop-blur cursor-pointer hover:bg-card transition-colors shadow-md group"
                  onClick={copyClassCode}
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Mã lớp</p>
                    <p className="font-mono font-bold text-lg text-foreground">{classData.class_code}</p>
                  </div>
                  <Copy className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-card rounded-xl border shadow-sm p-1.5 overflow-x-auto">
              <TabsList className="w-full flex justify-start gap-1 bg-transparent">
                <TabsTrigger 
                  value="stream" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Bảng tin</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="live" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Phiên học</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="assignments" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Bài tập</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="materials" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Tài liệu</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Thành viên</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule" 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Lịch học</span>
                </TabsTrigger>
                {isTeacher && (
                  <>
                    <TabsTrigger 
                      value="questions" 
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                      <Library className="h-4 w-4" />
                      <span className="hidden sm:inline">Ngân hàng</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings" 
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Cài đặt</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="animate-fade-in">
              <TabsContent value="stream" className="mt-0">
                <ClassStream 
                  classId={classData.id} 
                  isTeacher={isTeacher} 
                  profileId={profile.id}
                />
              </TabsContent>

              <TabsContent value="live" className="mt-0">
                <LiveSessionManager
                  classId={classData.id}
                  isTeacher={isTeacher}
                />
              </TabsContent>

              <TabsContent value="assignments" className="mt-0">
                <ClassAssignments 
                  classId={classData.id} 
                  isTeacher={isTeacher}
                />
              </TabsContent>

              <TabsContent value="materials" className="mt-0">
                <ClassMaterials 
                  classId={classData.id} 
                  isTeacher={isTeacher}
                />
              </TabsContent>

              <TabsContent value="members" className="mt-0">
                <ClassMembers 
                  classId={classData.id} 
                  isTeacher={isTeacher}
                  teacherId={classData.teacher_id}
                  classCode={classData.class_code}
                />
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <ClassSchedule
                  classId={classData.id}
                  isTeacher={isTeacher}
                />
              </TabsContent>

              {isTeacher && (
                <>
                  <TabsContent value="questions" className="mt-0">
                    <QuestionBank classId={classData.id} />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0">
                    <ClassSettings 
                      classData={classData}
                      onUpdate={handleClassUpdate}
                    />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
