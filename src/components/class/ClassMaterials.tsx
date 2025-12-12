import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Download, Trash2, Folder, Upload, File, Image, Video, Music, FileArchive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return FileText;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return FileArchive;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ClassMaterials({ classId, isTeacher }: ClassMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();

    // Setup realtime subscription
    const channel = supabase
      .channel('materials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials',
          filter: `class_id=eq.${classId}`
        },
        () => {
          fetchMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'Lỗi',
          description: 'File quá lớn. Kích thước tối đa là 50MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      if (!newMaterial.title) {
        setNewMaterial(prev => ({ ...prev, title: file.name.split('.')[0] }));
      }
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
    setUploadProgress(0);

    try {
      let fileUrl = null;
      let fileType = null;

      if (selectedFile) {
        // Upload file to storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${classId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('materials')
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
        fileType = selectedFile.type;
        setUploadProgress(100);
      }

      // Insert material record
      const { error } = await supabase
        .from('materials')
        .insert({
          class_id: classId,
          title: newMaterial.title,
          description: newMaterial.description || null,
          file_url: fileUrl,
          file_type: fileType,
        });

      if (error) throw error;

      setNewMaterial({ title: '', description: '' });
      setSelectedFile(null);
      setIsCreateOpen(false);
      fetchMaterials();
      toast({
        title: 'Thành công',
        description: 'Tài liệu đã được thêm',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thêm tài liệu',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setUploadProgress(0);
    }
  };

  const deleteMaterial = async (material: Material) => {
    if (!confirm(`Bạn có chắc muốn xóa tài liệu "${material.title}"?`)) return;

    try {
      // Delete file from storage if exists
      if (material.file_url) {
        const path = material.file_url.split('/materials/')[1];
        if (path) {
          await supabase.storage.from('materials').remove([path]);
        }
      }

      // Delete material record
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;

      setMaterials(materials.filter(m => m.id !== material.id));
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm tài liệu mới</DialogTitle>
              <DialogDescription>
                Tải lên tài liệu học tập cho lớp (tối đa 50MB).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* File Upload Area */}
              <div className="space-y-2">
                <Label>Tệp đính kèm</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="*/*"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <File className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Nhấp để chọn tệp</p>
                    <p className="text-sm text-muted-foreground">hoặc kéo thả vào đây</p>
                  </div>
                )}
              </div>

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

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Đang tải lên...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Đang tải lên...' : 'Thêm tài liệu'}
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
          {materials.map((material) => {
            const FileIcon = getFileIcon(material.file_type);
            return (
              <Card key={material.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileIcon className="text-primary" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">{material.title}</h4>
                        {material.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{material.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(material.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {material.file_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={material.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download size={18} />
                          </a>
                        </Button>
                      )}
                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMaterial(material)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
