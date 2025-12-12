import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Save, Mail, Phone, User, BookOpen, GraduationCap } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [stats, setStats] = useState({
    classCount: 0,
    assignmentCount: 0,
    submissionCount: 0,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        avatar_url: profile.avatar_url || "",
      });
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      if (profile.role === "teacher") {
        const { count: classCount } = await supabase
          .from("classes")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", profile.id);

        const { data: classes } = await supabase
          .from("classes")
          .select("id")
          .eq("teacher_id", profile.id);

        let assignmentCount = 0;
        if (classes && classes.length > 0) {
          const { count } = await supabase
            .from("assignments")
            .select("*", { count: "exact", head: true })
            .in("class_id", classes.map(c => c.id));
          assignmentCount = count || 0;
        }

        setStats({
          classCount: classCount || 0,
          assignmentCount,
          submissionCount: 0,
        });
      } else {
        const { count: classCount } = await supabase
          .from("class_members")
          .select("*", { count: "exact", head: true })
          .eq("student_id", profile.id);

        const { count: submissionCount } = await supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("student_id", profile.id);

        setStats({
          classCount: classCount || 0,
          assignmentCount: 0,
          submissionCount: submissionCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin cá nhân",
      });
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {formData.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl font-bold">{formData.full_name}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
              <Badge className="mt-3" variant={profile.role === "teacher" ? "default" : "secondary"}>
                {profile.role === "teacher" ? (
                  <>
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Giáo viên
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3 mr-1" />
                    Học sinh
                  </>
                )}
              </Badge>

              <Separator className="my-6" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.classCount}</p>
                  <p className="text-sm text-muted-foreground">Lớp học</p>
                </div>
                {profile.role === "teacher" ? (
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.assignmentCount}</p>
                    <p className="text-sm text-muted-foreground">Bài tập</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.submissionCount}</p>
                    <p className="text-sm text-muted-foreground">Bài nộp</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật thông tin hồ sơ của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  <User className="h-4 w-4 inline mr-2" />
                  Họ và tên
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">
                  <Camera className="h-4 w-4 inline mr-2" />
                  URL ảnh đại diện
                </Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button onClick={handleSave} disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
