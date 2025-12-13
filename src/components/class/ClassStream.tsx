import { useState, useEffect } from 'react';
import { Plus, Send, Pin, PinOff, Trash2, MoreVertical, MessageSquare, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { notifyNewAnnouncement } from '@/lib/notifications';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author_id: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ClassStreamProps {
  classId: string;
  isTeacher: boolean;
  profileId: string;
}

export default function ClassStream({ classId, isTeacher, profileId }: ClassStreamProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();

    // Realtime subscription
    const channel = supabase
      .channel(`announcements-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `class_id=eq.${classId}`
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, is_pinned, created_at, author_id')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author info
      const authorIds = [...new Set(data?.map(a => a.author_id) || [])];
      const { data: authorData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const authorMap = new Map(authorData?.map(a => [a.id, a]) || []);

      const announcementsWithAuthors = data?.map(a => ({
        ...a,
        author: authorMap.get(a.author_id) || null
      })) || [];

      setAnnouncements(announcementsWithAuthors);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập nội dung thông báo',
        variant: 'destructive',
      });
      return;
    }

    setIsPosting(true);
    try {
      const announcementTitle = newTitle.trim() || 'Thông báo';
      
      const { error } = await supabase
        .from('announcements')
        .insert({
          class_id: classId,
          author_id: profileId,
          title: announcementTitle,
          content: newContent.trim(),
        });

      if (error) throw error;

      // Get class info and notify all students
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      const { data: members } = await supabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', classId);

      if (members && classData) {
        for (const member of members) {
          await notifyNewAnnouncement(
            member.student_id,
            announcementTitle,
            classData.name,
            classId
          );
        }
      }

      setNewTitle('');
      setNewContent('');
      setShowComposer(false);
      toast({
        title: 'Thành công',
        description: 'Thông báo đã được đăng và gửi đến học sinh',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể đăng thông báo',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !announcement.is_pinned })
        .eq('id', announcement.id);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: announcement.is_pinned ? 'Đã bỏ ghim' : 'Đã ghim thông báo',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: 'Đã xóa thông báo',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
  };

  const handleSaveEdit = async () => {
    if (!editingAnnouncement || !editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editTitle.trim() || 'Thông báo',
          content: editContent.trim(),
        })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;

      setEditingAnnouncement(null);
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông báo',
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
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
    <div className="space-y-4">
      {/* Post Box for Teachers */}
      {isTeacher && (
        <Card>
          <CardContent className="p-4">
            {!showComposer ? (
              <div 
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowComposer(true)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">GV</AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">Thông báo nội dung nào đó cho lớp học của bạn...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Tiêu đề (tùy chọn)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Nội dung thông báo..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[120px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowComposer(false);
                    setNewTitle('');
                    setNewContent('');
                  }}>
                    Hủy
                  </Button>
                  <Button onClick={handlePost} disabled={isPosting || !newContent.trim()}>
                    <Send size={16} className="mr-1" />
                    {isPosting ? 'Đang đăng...' : 'Đăng'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="font-semibold mb-2">Chưa có thông báo nào</h3>
            <p className="text-muted-foreground">
              {isTeacher ? 'Đăng thông báo đầu tiên cho lớp học của bạn' : 'Giáo viên chưa đăng thông báo nào'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={`transition-all ${announcement.is_pinned ? 'border-primary shadow-md' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={announcement.author?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {announcement.author ? getInitials(announcement.author.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{announcement.author?.full_name || 'Không xác định'}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: vi })}
                        </span>
                        {announcement.is_pinned && (
                          <Badge variant="secondary" className="gap-1">
                            <Pin size={12} />
                            Đã ghim
                          </Badge>
                        )}
                      </div>
                      {isTeacher && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePin(announcement)}>
                              {announcement.is_pinned ? (
                                <>
                                  <PinOff className="mr-2 h-4 w-4" />
                                  Bỏ ghim
                                </>
                              ) : (
                                <>
                                  <Pin className="mr-2 h-4 w-4" />
                                  Ghim
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {announcement.title !== 'Thông báo' && (
                      <h4 className="font-semibold mt-2">{announcement.title}</h4>
                    )}
                    <p className="text-foreground whitespace-pre-wrap mt-2">{announcement.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông báo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Tiêu đề"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              placeholder="Nội dung..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
              Hủy
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}