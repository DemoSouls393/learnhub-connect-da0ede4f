import { useState, useEffect } from 'react';
import { Plus, FileText, Download, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  folder: string | null;
  created_at: string;
}

interface ClassMaterialsProps {
  classId: string;
  isTeacher: boolean;
}

export default function ClassMaterials({ classId, isTeacher }: ClassMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    file_url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, [classId]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newMaterial.title.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề tài liệu',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          class_id: classId,
          title: newMaterial.title,
          description: newMaterial.description || null,
          file_url: newMaterial.file_url || null,
        });

      if (error) throw error;

      setNewMaterial({ title: '', description: '', file_url: '' });
      setIsCreateOpen(false);
      fetchMaterials();
      toast({
        title: 'Thành công',
        description: 'Tài liệu đã được thêm',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thêm tài liệu',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài liệu "${title}"?`)) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMaterials(materials.filter(m => m.id !== id));
      toast({
        title: 'Thành công',
        description: 'Đã xóa tài liệu',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Button for Teachers */}
      {isTeacher && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus size={18} />
              Thêm tài liệu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm tài liệu mới</DialogTitle>
              <DialogDescription>
                Thêm tài liệu học tập cho lớp.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  placeholder="VD: Slide bài giảng Chương 1"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả về tài liệu..."
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file_url">Link tài liệu</Label>
                <Input
                  id="file_url"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newMaterial.file_url}
                  onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Đang thêm...' : 'Thêm tài liệu'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="text-lg font-semibold mb-2">Chưa có tài liệu nào</h3>
            <p className="text-muted-foreground">
              {isTeacher ? 'Thêm tài liệu học tập cho lớp' : 'Giáo viên chưa chia sẻ tài liệu'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <Card key={material.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="text-primary" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium">{material.title}</h4>
                      {material.description && (
                        <p className="text-sm text-muted-foreground">{material.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(material.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {material.file_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                          <Download size={18} />
                        </a>
                      </Button>
                    )}
                    {isTeacher && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMaterial(material.id, material.title)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}