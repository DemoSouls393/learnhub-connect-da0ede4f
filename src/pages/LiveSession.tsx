import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Users,
  Send,
  Hand,
  Monitor,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type LiveSession = Tables<"live_sessions">;
type Profile = Tables<"profiles">;

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  handRaised: boolean;
}

const LiveSessionPage = () => {
  const { classId, sessionId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (sessionId && profile) {
      fetchSessionData();
      joinSession();
    }

    return () => {
      leaveSession();
    };
  }, [sessionId, profile]);

  // Real-time chat subscription
  useEffect(() => {
    const channel = supabase.channel(`session-${sessionId}`)
      .on("broadcast", { event: "chat" }, (payload) => {
        setChatMessages(prev => [...prev, payload.payload as ChatMessage]);
      })
      .on("broadcast", { event: "participant_update" }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      setSession(sessionData);
      setIsHost(sessionData.host_id === profile?.id);

      await fetchParticipants();
    } catch (error) {
      console.error("Error fetching session:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải phiên học",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from("session_participants")
      .select("*, profiles:user_id(full_name, avatar_url)")
      .eq("session_id", sessionId)
      .is("left_at", null);

    if (data) {
      setParticipants(data.map(p => ({
        id: p.user_id,
        name: (p.profiles as Profile)?.full_name || "Unknown",
        avatar: (p.profiles as Profile)?.avatar_url || undefined,
        isHost: session?.host_id === p.user_id,
        isMuted: true,
        isVideoOff: true,
        handRaised: false,
      })));
    }
  };

  const joinSession = async () => {
    if (!profile) return;

    try {
      // Check if already joined
      const { data: existing } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", profile.id)
        .is("left_at", null)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("session_participants")
          .insert({
            session_id: sessionId,
            user_id: profile.id,
          });
      }

      // Broadcast participant update
      await supabase.channel(`session-${sessionId}`)
        .send({ type: "broadcast", event: "participant_update", payload: {} });
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const leaveSession = async () => {
    if (!profile || !sessionId) return;

    try {
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Update participation record
      await supabase
        .from("session_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", profile.id)
        .is("left_at", null);

      // Broadcast participant update
      await supabase.channel(`session-${sessionId}`)
        .send({ type: "broadcast", event: "participant_update", payload: {} });
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  };

  const toggleVideo = async () => {
    try {
      if (isVideoOff) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
      setIsVideoOff(!isVideoOff);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể truy cập camera",
        variant: "destructive",
      });
    }
  };

  const toggleMic = async () => {
    try {
      if (isMuted) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (localStreamRef.current) {
          stream.getAudioTracks().forEach(track => {
            localStreamRef.current?.addTrack(track);
          });
        } else {
          localStreamRef.current = stream;
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => track.stop());
        }
      }
      setIsMuted(!isMuted);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể truy cập microphone",
        variant: "destructive",
      });
    }
  };

  const toggleHand = () => {
    setHandRaised(!handRaised);
    // Broadcast hand raise status
    supabase.channel(`session-${sessionId}`)
      .send({
        type: "broadcast",
        event: "hand_raise",
        payload: { userId: profile?.id, raised: !handRaised }
      });
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !profile) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: profile.id,
      userName: profile.full_name,
      message: chatMessage,
      timestamp: new Date(),
    };

    await supabase.channel(`session-${sessionId}`)
      .send({ type: "broadcast", event: "chat", payload: message });

    setChatMessage("");
  };

  const endSession = async () => {
    if (!isHost) return;

    try {
      await supabase
        .from("live_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      toast({
        title: "Phiên học đã kết thúc",
      });
      navigate(`/class/${classId}`);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể kết thúc phiên học",
        variant: "destructive",
      });
    }
  };

  const handleLeave = async () => {
    await leaveSession();
    navigate(`/class/${classId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLeave} className="text-white hover:bg-zinc-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-white">{session?.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-red-500">Trực tiếp</Badge>
              <span className="text-sm text-zinc-400">{participants.length} người tham gia</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowParticipants(!showParticipants)}
            className={`text-white hover:bg-zinc-700 ${showParticipants ? "bg-zinc-700" : ""}`}
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className={`text-white hover:bg-zinc-700 ${showChat ? "bg-zinc-700" : ""}`}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Local video */}
            <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
              <CardContent className="p-0 h-full flex items-center justify-center">
                {isVideoOff ? (
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary">
                        {profile?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium">{profile?.full_name} (Bạn)</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {isMuted && <Badge variant="destructive"><MicOff className="h-3 w-3" /></Badge>}
                  {handRaised && <Badge className="bg-yellow-500"><Hand className="h-3 w-3" /></Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Other participants */}
            {participants
              .filter(p => p.id !== profile?.id)
              .map(participant => (
                <Card key={participant.id} className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
                  <CardContent className="p-0 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-2xl bg-secondary">
                          {participant.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white font-medium">
                        {participant.name}
                        {participant.isHost && " (Host)"}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {participant.isMuted && <Badge variant="destructive"><MicOff className="h-3 w-3" /></Badge>}
                      {participant.handRaised && <Badge className="bg-yellow-500"><Hand className="h-3 w-3" /></Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-zinc-800 border-l border-zinc-700 flex flex-col">
            {showParticipants && (
              <div className="p-4 border-b border-zinc-700">
                <h3 className="font-semibold text-white mb-3">Người tham gia ({participants.length})</h3>
                <ScrollArea className="h-40">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar} />
                        <AvatarFallback>{p.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm flex-1">
                        {p.name}
                        {p.isHost && <Badge variant="outline" className="ml-2 text-xs">Host</Badge>}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {showChat && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-zinc-700">
                  <h3 className="font-semibold text-white">Tin nhắn</h3>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{msg.userName}</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-sm">{msg.message}</p>
                    </div>
                  ))}
                </ScrollArea>
                <div className="p-4 border-t border-zinc-700">
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Nhập tin nhắn..."
                      className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
                    />
                    <Button size="icon" onClick={sendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleMic}
            className="rounded-full h-14 w-14"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-14 w-14"
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>

          <Button
            variant={handRaised ? "warning" : "secondary"}
            size="lg"
            onClick={toggleHand}
            className="rounded-full h-14 w-14"
          >
            <Hand className="h-6 w-6" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => toast({ title: "Tính năng chia sẻ màn hình đang phát triển" })}
          >
            <Monitor className="h-6 w-6" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={isHost ? endSession : handleLeave}
            className="rounded-full h-14 w-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionPage;
