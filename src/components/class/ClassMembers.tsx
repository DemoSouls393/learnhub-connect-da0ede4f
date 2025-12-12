import { useState, useEffect } from 'react';
import { Users, Crown, Trash2, Mail, Copy, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Member {
  id: string;
  student_id: string;
  joined_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Teacher {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface ClassMembersProps {
  classId: string;
  isTeacher: boolean;
  teacherId: string;
  classCode?: string;
}

export default function ClassMembers({ classId, isTeacher, teacherId, classCode }: ClassMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();

    // Realtime subscription
    const channel = supabase
      .channel(`members-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_members',
          filter: `class_id=eq.${classId}`
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const fetchMembers = async () => {
    try {
      // Fetch teacher
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', teacherId)
        .single();

      setTeacher(teacherData);

      // Fetch members
      const { data: memberData, error } = await supabase
        .from('class_members')
        .select('id, student_id, joined_at')
        .eq('class_id', classId);

      if (error) throw error;

      // Fetch student profiles
      const studentIds = memberData?.map(m => m.student_id) || [];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds);

      const profileMap = new Map(profileData?.map(p => [p.id, p]) || []);

      const membersWithProfiles = memberData?.map(m => ({
        ...m,
        profile: profileMap.get(m.student_id) || null
      })) || [];

      // Sort by name
      membersWithProfiles.sort((a, b) => {
        const nameA = a.profile?.full_name || '';
        const nameB = b.profile?.full_name || '';
        return nameA.localeCompare(nameB, 'vi');
      });

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string, studentName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ${studentName} khỏi lớp?`)) return;

    try {
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: `Đã xóa ${studentName} khỏi lớp`,
      });
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xóa thành viên',
        variant: 'destructive',
      });
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/dashboard?join=${classCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Đã sao chép',
      description: 'Link mời đã được sao chép vào clipboard',
    });
  };

  const copyClassCode = () => {
    if (classCode) {
      navigator.clipboard.writeText(classCode);
      toast({
        title: 'Đã sao chép',
        description: `Mã lớp ${classCode} đã được sao chép`,
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

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.profile?.full_name.toLowerCase().includes(query) ||
      member.profile?.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Button for Teachers */}
      {isTeacher && (
        <div className="flex justify-end">
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus size={18} className="mr-1" />
            Mời học sinh
          </Button>
        </div>
      )}

      {/* Teacher */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="text-warning" size={20} />
            Giáo viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacher && (
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-12 w-12">
                <AvatarImage src={teacher.avatar_url || ''} />
                <AvatarFallback className="bg-warning text-warning-foreground text-lg">
                  {getInitials(teacher.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-lg">{teacher.full_name}</p>
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              </div>
              <Badge variant="secondary">Giáo viên</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="text-primary" size={20} />
              Học sinh ({members.length})
            </CardTitle>
          </div>
          {members.length > 5 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto mb-3 text-muted-foreground" size={40} />
              <p className="text-muted-foreground font-medium">Chưa có học sinh nào tham gia</p>
              {isTeacher && (
                <p className="text-sm text-muted-foreground mt-1">
                  Chia sẻ mã lớp để học sinh tham gia
                </p>
              )}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy học sinh phù hợp
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.profile ? getInitials(member.profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.profile?.full_name || 'Không xác định'}</p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden md:block">
                      Tham gia {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true, locale: vi })}
                    </span>
                    {isTeacher && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => removeMember(member.id, member.profile?.full_name || 'học sinh')}
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mời học sinh tham gia lớp</DialogTitle>
            <DialogDescription>
              Chia sẻ mã lớp hoặc link mời để học sinh tham gia lớp học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Mã lớp</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-center py-4 px-6 bg-muted rounded-lg">
                  <span className="text-3xl font-mono font-bold tracking-widest">{classCode}</span>
                </div>
                <Button variant="outline" size="icon" onClick={copyClassCode}>
                  <Copy size={18} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Học sinh nhập mã này tại trang Dashboard để tham gia lớp
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">hoặc</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Link mời</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/dashboard?join=${classCode}`}
                  className="text-sm"
                />
                <Button variant="outline" onClick={copyInviteLink}>
                  <Copy size={16} className="mr-1" />
                  Sao chép
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowInviteDialog(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}