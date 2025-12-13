import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-18">
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {!user ? (
              <>
                <Link
                  to="/auth"
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Đăng nhập
                </Link>
                <Button asChild variant="hero" size="default">
                  <Link to="/auth?mode=signup">Bắt đầu miễn phí</Link>
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 gap-2 px-2 rounded-full hover:bg-secondary">
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-semibold">
                          {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2" align="end">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-2">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                          {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="font-semibold text-sm">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        <Badge variant="outline" className="mt-1 w-fit text-xs badge-primary">
                          {profile?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                      <Link to="/profile">
                        <User className="mr-3 h-4 w-4" />
                        Hồ sơ cá nhân
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                      <Link to="/settings">
                        <Settings className="mr-3 h-4 w-4" />
                        Cài đặt
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="cursor-pointer rounded-lg py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 animate-slide-down border-t border-border/50">
            {!user ? (
              <>
                <Link
                  to="/auth"
                  className="block py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng nhập
                </Link>
                <Button asChild variant="hero" className="w-full">
                  <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                    Bắt đầu miễn phí
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 mb-2">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile?.full_name}</p>
                    <Badge variant="outline" className="mt-1 text-xs badge-primary">
                      {profile?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    </Badge>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  className="block py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="block py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Hồ sơ cá nhân
                </Link>
                <Link
                  to="/settings"
                  className="block py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Cài đặt
                </Link>
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
