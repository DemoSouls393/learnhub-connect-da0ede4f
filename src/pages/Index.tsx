import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Video, 
  BookOpen, 
  ClipboardCheck, 
  Shield, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';

const features = [
  {
    icon: Video,
    title: 'Lớp học trực tuyến',
    description: 'Video call chất lượng cao, chia sẻ màn hình, bảng trắng tương tác và ghi lại buổi học.',
  },
  {
    icon: BookOpen,
    title: 'Quản lý lớp học',
    description: 'Tạo lớp, quản lý học sinh, chia sẻ tài liệu và thông báo dễ dàng.',
  },
  {
    icon: ClipboardCheck,
    title: 'Bài tập & Kiểm tra',
    description: 'Tạo đề thi trắc nghiệm, tự luận với chống gian lận và chấm điểm tự động.',
  },
  {
    icon: Shield,
    title: 'Chống gian lận',
    description: 'Giám sát camera, phát hiện chuyển tab, xáo trộn câu hỏi và đáp án.',
  },
];

const stats = [
  { value: '1,000+', label: 'Giáo viên đang sử dụng' },
  { value: '50,000+', label: 'Học sinh đã tham gia' },
  { value: '100,000+', label: 'Bài kiểm tra đã tạo' },
  { value: '99.9%', label: 'Uptime hệ thống' },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <GraduationCap size={16} />
              <span>Nền tảng giáo dục số 1 Việt Nam</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
              Học tập trực tuyến
              <span className="text-gradient-hero block">hiệu quả và dễ dàng</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              EduHub kết hợp lớp học trực tuyến, quản lý lớp học và kiểm tra đánh giá 
              trong một nền tảng duy nhất. Dành cho giáo viên và học sinh.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tất cả trong một nền tảng
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Không cần dùng nhiều ứng dụng khác nhau. EduHub cung cấp đầy đủ 
              công cụ để dạy và học hiệu quả.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border card-hover animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="text-primary" size={24} />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers & Students Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Teachers */}
            <div className="p-8 rounded-2xl bg-card border border-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <GraduationCap className="text-primary-foreground" size={24} />
                </div>
                <h3 className="text-2xl font-display font-bold">Dành cho Giáo viên</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Tạo lớp học và mời học sinh tham gia',
                  'Dạy trực tuyến với video và bảng trắng',
                  'Tạo bài tập và bài kiểm tra đa dạng',
                  'Chấm điểm tự động và theo dõi tiến độ',
                  'Quản lý tài liệu và thông báo',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="text-success mt-0.5 flex-shrink-0" size={18} />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="default">
                <Link to="/auth?mode=signup">
                  Đăng ký làm Giáo viên
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>

            {/* For Students */}
            <div className="p-8 rounded-2xl bg-card border border-border animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                  <BookOpen className="text-accent-foreground" size={24} />
                </div>
                <h3 className="text-2xl font-display font-bold">Dành cho Học sinh</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Tham gia lớp học bằng mã lớp',
                  'Học trực tuyến mọi lúc mọi nơi',
                  'Làm bài tập và bài kiểm tra online',
                  'Xem điểm và nhận phản hồi từ giáo viên',
                  'Tải tài liệu học tập',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="text-accent mt-0.5 flex-shrink-0" size={18} />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary">
                <Link to="/auth?mode=signup">
                  Đăng ký làm Học sinh
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center p-8 md:p-12 rounded-3xl bg-gradient-to-r from-primary to-primary/80">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Tham gia cùng hàng ngàn giáo viên và học sinh đang sử dụng EduHub mỗi ngày.
            </p>
            <Button asChild size="xl" className="bg-background text-foreground hover:bg-background/90">
              <Link to="/auth?mode=signup">
                Tạo tài khoản miễn phí
                <ArrowRight size={20} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <GraduationCap className="text-primary-foreground" size={18} />
              </div>
              <span className="font-display font-bold text-gradient">EduHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 EduHub. Nền tảng giáo dục trực tuyến.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}