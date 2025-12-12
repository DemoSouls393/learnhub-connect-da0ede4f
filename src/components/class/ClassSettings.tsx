import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2, AlertTriangle, Image } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  class_code: string;
  cover_image: string | null;
  is_active: boolean;
}

interface ClassSettingsProps {
  classData: ClassData;
  onUpdate: (data: Partial<ClassData>) => void;
}

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=200&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=200&fit=crop',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=200&fit=crop',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=200&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=200&fit=crop',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&h=200&fit=crop',
];

export default function ClassSettings({ classData, onUpdate }: ClassSettingsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: classData.name,
    description: classData.description || '',
    subject: classData.subject || '',
    cover_image: classData.cover_image || '',
    is_active: classData.is_active,
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Tên lớp không được để trống',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          subject: formData.subject.trim() || null,
          cover_image: formData.cover_image || null,
          is_active: formData.is_active,
        })
        .eq('id', classData.id);

      if (error) throw error;

      onUpdate({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        subject: formData.subject.trim() || null,
        cover_image: formData.cover_image || null,
        is_active: formData.is_active,
      });

      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin lớp học',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật lớp học',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classData.id);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: 'Đã xóa lớp học',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xóa lớp học',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
          <CardDescription>Cập nhật tên, mô tả và môn học của lớp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên lớp học *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Toán 12A1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Môn học</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="VD: Toán học"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả về lớp học..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cover Image */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image size={20} />
            Ảnh bìa
          </CardTitle>
          <CardDescription>Chọn ảnh bìa hiển thị cho lớp học</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COVER_IMAGES.map((img, index) => (
              <div
                key={index}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  formData.cover_image === img ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                }`}
                onClick={() => setFormData({ ...formData, cover_image: img })}
              >
                <img
                  src={img}
                  alt={`Cover ${index + 1}`}
                  className="w-full h-20 object-cover"
                />
              </div>
            ))}
          </div>
          {formData.cover_image && (
            <Button
              variant="link"
              className="mt-2 p-0 h-auto"
              onClick={() => setFormData({ ...formData, cover_image: '' })}
            >
              Xóa ảnh bìa
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Class Status */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái lớp học</CardTitle>
          <CardDescription>Quản lý trạng thái hoạt động của lớp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Kích hoạt lớp học</p>
              <p className="text-sm text-muted-foreground">
                Lớp không kích hoạt sẽ không hiển thị với học sinh
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save size={16} className="mr-1" />
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle size={20} />
            Vùng nguy hiểm
          </CardTitle>
          <CardDescription>
            Các hành động không thể hoàn tác. Hãy cân nhắc kỹ trước khi thực hiện.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 size={16} className="mr-1" />
                Xóa lớp học
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến lớp học 
                  bao gồm bài tập, thành viên, và tài liệu sẽ bị xóa vĩnh viễn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Xóa lớp học
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}