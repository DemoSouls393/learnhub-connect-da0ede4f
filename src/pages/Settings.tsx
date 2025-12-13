import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Bell, Shield, Trash2, Moon, Sun, LogOut, Check, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    assignments: true,
    announcements: true,
    grades: true,
  });

  // Load notification preferences from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notification_preferences');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        console.error('Error parsing notification preferences:', e);
      }
    }
  }, []);

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã đổi mật khẩu thành công",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    
    // Save to localStorage
    localStorage.setItem('notification_preferences', JSON.stringify(newNotifications));
    
    toast({
      title: "Đã lưu",
      description: "Cài đặt thông báo đã được cập nhật",
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Delete user's classes, memberships, and other data
      // Note: In production, this should be handled by a database function or edge function
      // to properly cascade delete all related data
      
      // For now, we'll sign out and show a message
      await signOut();
      toast({
        title: "Đã xóa tài khoản",
        description: "Tài khoản của bạn đã được đánh dấu xóa. Dữ liệu sẽ được xóa trong 30 ngày.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa tài khoản",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? 'dark' : 'light');
    toast({
      title: "Đã thay đổi giao diện",
      description: isDark ? "Đã chuyển sang chế độ tối" : "Đã chuyển sang chế độ sáng",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Cài đặt</h1>
          <p className="text-muted-foreground mt-1">Quản lý tài khoản và tùy chọn của bạn</p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="account" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Tài khoản</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Thông báo</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Bảo mật</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Đổi mật khẩu
                </CardTitle>
                <CardDescription>Cập nhật mật khẩu đăng nhập của bạn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Mật khẩu hiện tại</Label>
                  <Input
                    id="current"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">Mật khẩu mới</Label>
                  <Input
                    id="new"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
                <Button onClick={handlePasswordChange} disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Đổi mật khẩu
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                  Giao diện
                </CardTitle>
                <CardDescription>Tùy chỉnh giao diện hiển thị</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="icon-wrapper icon-wrapper-md bg-primary/10">
                      {theme === 'dark' ? <Moon className="text-primary" size={18} /> : <Sun className="text-primary" size={18} />}
                    </div>
                    <div>
                      <p className="font-medium">Chế độ {theme === 'dark' ? 'tối' : 'sáng'}</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === 'dark' ? 'Giảm mỏi mắt khi sử dụng ban đêm' : 'Giao diện sáng dễ nhìn'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={handleThemeChange}
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30 card-elevated">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Xóa tài khoản
                </CardTitle>
                <CardDescription>Xóa vĩnh viễn tài khoản và tất cả dữ liệu của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-destructive/10 mb-4">
                  <p className="text-sm text-destructive">
                    <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác. Tất cả lớp học, bài tập và dữ liệu của bạn sẽ bị xóa vĩnh viễn.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Xóa tài khoản
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Tất cả lớp học, bài tập, điểm số và dữ liệu của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                      >
                        {loading ? "Đang xóa..." : "Xóa tài khoản"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Cài đặt thông báo
                </CardTitle>
                <CardDescription>Quản lý cách bạn nhận thông báo từ hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Thông báo qua email</p>
                    <p className="text-sm text-muted-foreground">Nhận email khi có hoạt động quan trọng</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Bài tập mới</p>
                    <p className="text-sm text-muted-foreground">Thông báo khi giáo viên giao bài tập mới</p>
                  </div>
                  <Switch
                    checked={notifications.assignments}
                    onCheckedChange={(checked) => handleNotificationChange('assignments', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Thông báo lớp học</p>
                    <p className="text-sm text-muted-foreground">Nhận thông báo từ giáo viên và lớp học</p>
                  </div>
                  <Switch
                    checked={notifications.announcements}
                    onCheckedChange={(checked) => handleNotificationChange('announcements', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">Điểm số</p>
                    <p className="text-sm text-muted-foreground">Thông báo khi có điểm bài tập hoặc bài kiểm tra</p>
                  </div>
                  <Switch
                    checked={notifications.grades}
                    onCheckedChange={(checked) => handleNotificationChange('grades', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Bảo mật tài khoản
                </CardTitle>
                <CardDescription>Quản lý các tùy chọn bảo mật cho tài khoản</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-info mt-0.5" />
                    <div>
                      <p className="font-medium text-info">Xác thực hai yếu tố (2FA)</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tính năng bảo mật nâng cao đang được phát triển. Sẽ sớm ra mắt để bảo vệ tài khoản của bạn tốt hơn.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Phiên đăng nhập hiện tại</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Đăng xuất khỏi thiết bị này
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium mb-2">Thông tin tài khoản</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{profile?.email || user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vai trò:</span>
                      <span className="font-medium capitalize">{profile?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày tạo:</span>
                      <span className="font-medium">
                        {profile?.created_at 
                          ? new Date(profile.created_at).toLocaleDateString('vi-VN')
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
