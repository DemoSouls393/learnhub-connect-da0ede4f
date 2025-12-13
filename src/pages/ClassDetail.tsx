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
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

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

const MENU_ITEMS = [
  { id: 'stream', label: 'Bảng tin', icon: Bell },
  { id: 'live', label: 'Phiên học', icon: Video },
  { id: 'assignments', label: 'Bài tập', icon: ClipboardCheck },
  { id: 'materials', label: 'Tài liệu', icon: FileText },
  { id: 'members', label: 'Thành viên', icon: Users },
  { id: 'schedule', label: 'Lịch học', icon: Calendar },
];

const TEACHER_MENU_ITEMS = [
  { id: 'questions', label: 'Ngân hàng câu hỏi', icon: Library },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [activeTab, setActiveTab] = useState('stream');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const allMenuItems = isTeacher 
    ? [...MENU_ITEMS, ...TEACHER_MENU_ITEMS] 
    : MENU_ITEMS;

  const renderContent = () => {
    if (!classData || !profile) return null;

    switch (activeTab) {
      case 'stream':
        return <ClassStream classId={classData.id} isTeacher={isTeacher} profileId={profile.id} />;
      case 'live':
        return <LiveSessionManager classId={classData.id} isTeacher={isTeacher} />;
      case 'assignments':
        return <ClassAssignments classId={classData.id} isTeacher={isTeacher} />;
      case 'materials':
        return <ClassMaterials classId={classData.id} isTeacher={isTeacher} />;
      case 'members':
        return <ClassMembers classId={classData.id} isTeacher={isTeacher} teacherId={classData.teacher_id} classCode={classData.class_code} />;
      case 'schedule':
        return <ClassSchedule classId={classData.id} isTeacher={isTeacher} />;
      case 'questions':
        return isTeacher ? <QuestionBank classId={classData.id} /> : null;
      case 'settings':
        return isTeacher ? <ClassSettings classData={classData} onUpdate={handleClassUpdate} /> : null;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!classData || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Header */}
        <div className="bg-gradient-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="py-6">
              {/* Back button */}
              <Link 
                to="/dashboard" 
                className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground text-sm mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Link>
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{classData.name}</h1>
                    {classData.subject && (
                      <p className="text-primary-foreground/80 mt-1">{classData.subject}</p>
                    )}
                  </div>
                </div>

                {/* Class code */}
                <button 
                  onClick={copyClassCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  <span className="font-mono font-bold">{classData.class_code}</span>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content with sidebar */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Main content - Left */}
            <div className="flex-1 min-w-0">
              {renderContent()}
            </div>

            {/* Sidebar - Right (Desktop) */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 bg-card rounded-xl border shadow-sm overflow-hidden">
                <nav className="p-2">
                  {allMenuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                        activeTab === item.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {allMenuItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex-1 min-w-[64px] flex flex-col items-center gap-1 py-3 px-2 transition-colors",
                  activeTab === item.id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </button>
            ))}
            
            {/* More menu for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex-1 min-w-[64px] flex flex-col items-center gap-1 py-3 px-2 transition-colors",
                isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="text-[10px] font-medium">Thêm</span>
            </button>
          </div>

          {/* Mobile expanded menu */}
          {isMobileMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-card border-t shadow-lg">
              <div className="p-2 grid grid-cols-3 gap-2">
                {allMenuItems.slice(5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg transition-colors",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Padding for mobile bottom nav */}
        <div className="lg:hidden h-20" />
      </main>
    </div>
  );
}
