import { useState, useEffect } from 'react';
import { Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
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
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
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
    if (!newAnnouncement.trim()) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          class_id: classId,
          author_id: profileId,
          title: 'Thông báo',
          content: newAnnouncement,
        });

      if (error) throw error;

      setNewAnnouncement('');
      fetchAnnouncements();
      toast({
        title: 'Thành công',
        description: 'Thông báo đã được đăng',
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
            <Textarea
              placeholder="Đăng thông báo cho lớp học..."
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              className="min-h-[100px] mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handlePost} disabled={isPosting || !newAnnouncement.trim()}>
                <Send size={16} />
                {isPosting ? 'Đang đăng...' : 'Đăng thông báo'}
              </Button>
            </div>
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
            <p className="text-muted-foreground">Chưa có thông báo nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={announcement.is_pinned ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={announcement.author?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {announcement.author ? getInitials(announcement.author.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{announcement.author?.full_name || 'Không xác định'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: vi })}
                      </span>
                      {announcement.is_pinned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Ghim
                        </span>
                      )}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
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