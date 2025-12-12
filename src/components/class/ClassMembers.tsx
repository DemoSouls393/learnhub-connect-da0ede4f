import { useState, useEffect } from 'react';
import { Users, Crown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

export default function ClassMembers({ classId, isTeacher, teacherId }: ClassMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
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

      setMembers(members.filter(m => m.id !== memberId));
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      {/* Teacher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="text-warning" size={20} />
            Giáo viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacher && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={teacher.avatar_url || ''} />
                <AvatarFallback className="bg-warning text-warning-foreground">
                  {getInitials(teacher.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{teacher.full_name}</p>
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="text-primary" size={20} />
            Học sinh ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Chưa có học sinh nào tham gia</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
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
                  {isTeacher && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeMember(member.id, member.profile?.full_name || 'học sinh')}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}