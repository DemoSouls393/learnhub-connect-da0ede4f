import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Sparkles, BookOpen, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/layout/Logo';
import { Badge } from '@/components/ui/badge';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  role: z.enum(['teacher', 'student']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignup, setIsSignup] = useState(searchParams.get('mode') === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Đăng nhập thất bại',
        description: error.message === 'Invalid login credentials' 
          ? 'Email hoặc mật khẩu không đúng'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn quay trở lại!',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (data: SignupForm) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName, data.role);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Email đã tồn tại',
          description: 'Vui lòng sử dụng email khác hoặc đăng nhập',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Đăng ký thất bại',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Đăng ký thành công!',
        description: 'Tài khoản của bạn đã được tạo.',
      });
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-background relative">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        
        <div className="w-full max-w-md relative animate-fade-in">
          <div className="mb-10">
            <Logo size="lg" />
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              {isSignup ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isSignup
                ? 'Bắt đầu hành trình học tập của bạn'
                : 'Đăng nhập để tiếp tục'}
            </p>
          </div>

          {isSignup ? (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Họ và tên</Label>
                <Input
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  {...signupForm.register('fullName')}
                  className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background"
                />
                {signupForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...signupForm.register('email')}
                  className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background"
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Bạn là</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => signupForm.setValue('role', 'student')}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                      signupForm.watch('role') === 'student'
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border hover:border-primary/50 bg-secondary/30'
                    }`}
                  >
                    <BookOpen className={`h-7 w-7 mx-auto mb-3 ${signupForm.watch('role') === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-semibold">Học sinh</p>
                    <p className="text-xs text-muted-foreground mt-1">Tham gia lớp học</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => signupForm.setValue('role', 'teacher')}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                      signupForm.watch('role') === 'teacher'
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border hover:border-primary/50 bg-secondary/30'
                    }`}
                  >
                    <Sparkles className={`h-7 w-7 mx-auto mb-3 ${signupForm.watch('role') === 'teacher' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-semibold">Giáo viên</p>
                    <p className="text-xs text-muted-foreground mt-1">Tạo & quản lý lớp</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...signupForm.register('password')}
                    className="h-12 rounded-xl pr-12 border-border bg-secondary/30 focus:bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...signupForm.register('confirmPassword')}
                  className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background"
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </span>
                ) : (
                  <>
                    Đăng ký
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="email@example.com"
                  {...loginForm.register('email')}
                  className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                    className="h-12 rounded-xl pr-12 border-border bg-secondary/30 focus:bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </span>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {isSignup ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="ml-2 text-primary font-semibold hover:underline"
              >
                {isSignup ? 'Đăng nhập' : 'Đăng ký ngay'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-lg text-center text-primary-foreground relative animate-fade-in">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-xl shadow-2xl mb-8">
              <Users size={48} />
            </div>
          </div>
          <h2 className="text-4xl font-display font-bold mb-6">
            Nền tảng giáo dục tất cả trong một
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-12 leading-relaxed">
            Kết nối giáo viên và học sinh. Học trực tuyến, quản lý lớp học, 
            bài tập và kiểm tra - tất cả ở một nơi.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '1000+', label: 'Giáo viên' },
              { value: '50K+', label: 'Học sinh' },
              { value: '10K+', label: 'Lớp học' },
            ].map((stat, index) => (
              <div key={index} className="p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                <div className="text-3xl font-display font-bold">{stat.value}</div>
                <div className="text-sm text-primary-foreground/70">{stat.label}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 flex flex-col gap-3 text-left max-w-sm mx-auto">
            {['Bắt đầu miễn phí', 'Không cần thẻ tín dụng', 'Hỗ trợ 24/7'].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-primary-foreground/90">
                <CheckCircle size={18} className="text-white" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
