import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Video, Plus, Play, Calendar, Clock, Link2, Copy, Users, Trash2 } from "lucide-react";
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`sessions-${classId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `class_id=eq.${classId}` },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          status: "scheduled",
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
      
      // Show share dialog
      setShareSessionId(data.id);
      setShowShareDialog(true);
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

  const startSession = async (sessionId: string) => {
    try {
      await supabase
        .from("live_sessions")
        .update({ status: "live", actual_start: new Date().toISOString() })
        .eq("id", sessionId);

      navigate(`/class/${classId}/session/${sessionId}`);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const joinSession = (sessionId: string) => {
    navigate(`/class/${classId}/session/${sessionId}`);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await supabase.from("live_sessions").delete().eq("id", sessionId);
      toast({ title: "Đã xóa phiên học" });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const copySessionLink = (sessionId: string) => {
    const link = `${window.location.origin}/class/${classId}/session/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Đã sao chép link",
      description: "Gửi link này để mời người khác tham gia",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500 animate-pulse">Đang diễn ra</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Sẵn sàng</Badge>;
      case "ended":
        return <Badge variant="outline">Đã kết thúc</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeSessions = sessions.filter(s => s.status === "live");
  const scheduledSessions = sessions.filter(s => s.status === "scheduled");
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
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Video className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Bắt đầu: {session.actual_start && format(new Date(session.actual_start), "HH:mm", { locale: vi })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copySessionLink(session.id)}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => joinSession(session.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Tham gia ngay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Sessions */}
      {scheduledSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Phiên học sẵn sàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledSessions.map((session) => (
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
                      <p className="text-sm text-muted-foreground">
                        Tạo lúc: {format(new Date(session.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copySessionLink(session.id)}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    {isTeacher ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button onClick={() => startSession(session.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Bắt đầu
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => joinSession(session.id)}>
                        <Users className="h-4 w-4 mr-2" />
                        Vào phòng chờ
                      </Button>
                    )}
                  </div>
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
            <DialogDescription>
              Tạo một phiên học mới để bắt đầu họp video với học sinh
            </DialogDescription>
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
              {creating ? "Đang tạo..." : "Tạo phiên học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chia sẻ phiên học</DialogTitle>
            <DialogDescription>
              Sao chép link bên dưới và gửi cho học sinh để họ có thể tham gia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareSessionId ? `${window.location.origin}/class/${classId}/session/${shareSessionId}` : ""}
                className="flex-1"
              />
              <Button onClick={() => shareSessionId && copySessionLink(shareSessionId)}>
                <Copy className="h-4 w-4 mr-2" />
                Sao chép
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Đóng
            </Button>
            <Button onClick={() => {
              if (shareSessionId) {
                setShowShareDialog(false);
                startSession(shareSessionId);
              }
            }}>
              <Play className="h-4 w-4 mr-2" />
              Bắt đầu ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveSessionManager;
