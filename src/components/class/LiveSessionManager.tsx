import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Video, Plus, Play, Users, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type LiveSession = Tables<"live_sessions">;

interface LiveSessionManagerProps {
  classId: string;
  isTeacher: boolean;
}

const LiveSessionManager = ({ classId, isTeacher }: LiveSessionManagerProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [classId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim() || !profile) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("live_sessions")
        .insert({
          class_id: classId,
          host_id: profile.id,
          title: newSessionTitle,
          status: "live",
          actual_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã tạo phiên học trực tuyến",
      });
      setShowCreateDialog(false);
      setNewSessionTitle("");
      navigate(`/class/${classId}/session/${data.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo phiên học",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const joinSession = (sessionId: string) => {
    navigate(`/class/${classId}/session/${sessionId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500 animate-pulse">Đang diễn ra</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Đã lên lịch</Badge>;
      case "ended":
        return <Badge variant="outline">Đã kết thúc</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeSessions = sessions.filter(s => s.status === "live");
  const pastSessions = sessions.filter(s => s.status === "ended");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Video className="h-5 w-5 animate-pulse" />
              Phiên học đang diễn ra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{session.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Bắt đầu: {session.actual_start && format(new Date(session.actual_start), "HH:mm", { locale: vi })}
                    </p>
                  </div>
                  <Button onClick={() => joinSession(session.id)} variant="hero">
                    <Play className="h-4 w-4 mr-2" />
                    Tham gia ngay
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isTeacher && (
        <div className="flex gap-3">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo phiên học mới
          </Button>
        </div>
      )}

      {/* Past Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử phiên học</CardTitle>
        </CardHeader>
        <CardContent>
          {pastSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có phiên học nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {session.actual_start && format(new Date(session.actual_start), "dd/MM/yyyy", { locale: vi })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.actual_start && format(new Date(session.actual_start), "HH:mm", { locale: vi })}
                          {session.ended_at && ` - ${format(new Date(session.ended_at), "HH:mm", { locale: vi })}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo phiên học trực tuyến</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề phiên học</Label>
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="VD: Buổi học thứ 5 - Chương 3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button onClick={createSession} disabled={creating || !newSessionTitle.trim()}>
              {creating ? "Đang tạo..." : "Tạo và bắt đầu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveSessionManager;
