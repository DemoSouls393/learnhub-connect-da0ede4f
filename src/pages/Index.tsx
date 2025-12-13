import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Video, 
  BookOpen, 
  ClipboardCheck, 
  Shield, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Video,
    title: 'Lớp học trực tuyến',
    description: 'Video call HD, chia sẻ màn hình, bảng trắng tương tác và ghi lại buổi học.',
    color: 'bg-info/10 text-info',
    gradient: 'from-info/20 to-info/5',
  },
  {
    icon: BookOpen,
    title: 'Quản lý lớp học',
    description: 'Tạo lớp, quản lý học sinh, chia sẻ tài liệu và thông báo tức thì.',
    color: 'bg-primary/10 text-primary',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: ClipboardCheck,
    title: 'Bài tập & Kiểm tra',
    description: 'Tạo đề thi đa dạng với chấm điểm tự động và phân tích chi tiết.',
    color: 'bg-accent/10 text-accent',
    gradient: 'from-accent/20 to-accent/5',
  },
  {
    icon: Shield,
    title: 'Chống gian lận',
    description: 'Giám sát camera, phát hiện chuyển tab, xáo trộn câu hỏi và đáp án.',
    color: 'bg-warning/10 text-warning',
    gradient: 'from-warning/20 to-warning/5',
  },
];

const stats = [
  { value: '1,000+', label: 'Giáo viên tin dùng', icon: Users },
  { value: '50,000+', label: 'Học sinh tham gia', icon: Sparkles },
  { value: '100,000+', label: 'Bài kiểm tra', icon: ClipboardCheck },
  { value: '99.9%', label: 'Uptime', icon: Zap },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <Badge variant="outline" className="px-4 py-2 mb-6 badge-primary border-primary/30 text-sm font-medium">
                <Sparkles size={14} className="mr-2" />
                Nền tảng giáo dục số 1 Việt Nam
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight animate-fade-in stagger-1">
              Học tập trực tuyến
              <span className="text-gradient-hero block mt-2">hiệu quả và dễ dàng</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in stagger-2">
              EduHub kết hợp lớp học trực tuyến, quản lý lớp học và kiểm tra đánh giá 
              trong một nền tảng duy nhất. Dành cho giáo viên và học sinh.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in stagger-3">
              {user ? (
                <Button asChild variant="hero" size="xl">
                  <Link to="/dashboard">
                    Vào Dashboard
                    <ArrowRight size={20} />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="hero" size="xl">
                    <Link to="/auth?mode=signup">
                      Bắt đầu miễn phí
                      <ArrowRight size={20} />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="xl">
                    <Link to="/auth">
                      <Play size={18} className="mr-1" />
                      Đăng nhập
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="stat-card animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="icon-wrapper icon-wrapper-md bg-primary/10">
                  <stat.icon size={20} className="text-primary" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 section-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="px-4 py-2 mb-4 badge-accent">
              <BarChart3 size={14} className="mr-2" />
              Tính năng nổi bật
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tất cả trong một nền tảng
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Không cần dùng nhiều ứng dụng khác nhau. EduHub cung cấp đầy đủ 
              công cụ để dạy và học hiệu quả.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`icon-wrapper icon-wrapper-lg ${feature.color} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={26} />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers & Students Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* For Teachers */}
            <div className="feature-card p-8 group hover:border-primary/30 animate-fade-in">
              <div className="flex items-center gap-4 mb-8">
                <div className="icon-wrapper icon-wrapper-xl bg-gradient-primary shadow-primary">
                  <Sparkles className="text-primary-foreground" size={28} />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 badge-primary">Dành cho</Badge>
                  <h3 className="text-2xl font-display font-bold">Giáo viên</h3>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Tạo lớp học và mời học sinh tham gia',
                  'Dạy trực tuyến với video và bảng trắng',
                  'Tạo bài tập và bài kiểm tra đa dạng',
                  'Chấm điểm tự động và theo dõi tiến độ',
                  'Quản lý tài liệu và thông báo real-time',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="icon-wrapper icon-wrapper-sm bg-success/10 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="text-success" size={16} />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
                <Link to="/auth?mode=signup">
                  Đăng ký làm Giáo viên
                  <ArrowRight size={18} />
                </Link>
              </Button>
            </div>

            {/* For Students */}
            <div className="feature-card p-8 group hover:border-accent/30 animate-fade-in stagger-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="icon-wrapper icon-wrapper-xl bg-gradient-success shadow-glow-accent">
                  <BookOpen className="text-accent-foreground" size={28} />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 badge-accent">Dành cho</Badge>
                  <h3 className="text-2xl font-display font-bold">Học sinh</h3>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Tham gia lớp học bằng mã lớp',
                  'Học trực tuyến mọi lúc mọi nơi',
                  'Làm bài tập và bài kiểm tra online',
                  'Xem điểm và nhận phản hồi từ giáo viên',
                  'Tải tài liệu học tập dễ dàng',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="icon-wrapper icon-wrapper-sm bg-accent/10 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="text-accent" size={16} />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
                <Link to="/auth?mode=signup">
                  Đăng ký làm Học sinh
                  <ArrowRight size={18} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center p-10 md:p-16 rounded-3xl bg-gradient-primary relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4">
                Sẵn sàng bắt đầu?
              </h2>
              <p className="text-primary-foreground/80 mb-10 text-lg max-w-xl mx-auto">
                Tham gia cùng hàng ngàn giáo viên và học sinh đang sử dụng EduHub mỗi ngày.
              </p>
              <Button asChild size="xl" variant="glass" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Link to="/auth?mode=signup">
                  Tạo tài khoản miễn phí
                  <ArrowRight size={20} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper icon-wrapper-md bg-gradient-primary shadow-primary">
                <Sparkles className="text-primary-foreground" size={18} />
              </div>
              <span className="font-display font-bold text-xl text-gradient">EduHub</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              © 2024 EduHub. Nền tảng giáo dục trực tuyến hàng đầu Việt Nam.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
