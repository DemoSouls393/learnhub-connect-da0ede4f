import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, GraduationCap, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-20 md:pt-40 md:pb-32 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles size={16} />
              Nền tảng giáo dục trực tuyến
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight animate-fade-in stagger-1">
              Học tập dễ dàng
              <span className="text-gradient-hero block mt-2">mọi lúc, mọi nơi</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto animate-fade-in stagger-2">
              EduHub giúp giáo viên và học sinh kết nối, học tập và đánh giá hiệu quả trong một nền tảng duy nhất.
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
                      Đăng nhập
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="py-16 md:py-24 section-muted">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 animate-fade-in">
              <div className="icon-wrapper icon-wrapper-lg bg-primary/10 mx-auto mb-4">
                <GraduationCap className="text-primary" size={28} />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">Lớp học trực tuyến</h3>
              <p className="text-muted-foreground text-sm">
                Dạy và học qua video với bảng trắng tương tác
              </p>
            </div>
            
            <div className="text-center p-6 animate-fade-in stagger-1">
              <div className="icon-wrapper icon-wrapper-lg bg-accent/10 mx-auto mb-4">
                <BookOpen className="text-accent" size={28} />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">Bài tập & Kiểm tra</h3>
              <p className="text-muted-foreground text-sm">
                Tạo đề thi đa dạng với chấm điểm tự động
              </p>
            </div>
            
            <div className="text-center p-6 animate-fade-in stagger-2">
              <div className="icon-wrapper icon-wrapper-lg bg-success/10 mx-auto mb-4">
                <Users className="text-success" size={28} />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">Quản lý lớp học</h3>
              <p className="text-muted-foreground text-sm">
                Tổ chức lớp, tài liệu và thông báo dễ dàng
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-10 md:p-14 rounded-3xl bg-gradient-primary relative overflow-hidden">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
                Sẵn sàng bắt đầu?
              </h2>
              <p className="text-primary-foreground/80 mb-8">
                Tạo tài khoản miễn phí và trải nghiệm ngay hôm nay.
              </p>
              <Button asChild size="lg" variant="glass" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Link to="/auth?mode=signup">
                  Đăng ký ngay
                  <ArrowRight size={18} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="icon-wrapper icon-wrapper-sm bg-gradient-primary">
                <Sparkles className="text-primary-foreground" size={14} />
              </div>
              <span className="font-display font-bold text-lg text-gradient">EduHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 EduHub. Học tập hiệu quả.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
