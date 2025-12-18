import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Link2, Loader2 } from "lucide-react";
import VideoTile from "@/components/live-session/VideoTile";
import ChatPanel, { ChatMessage } from "@/components/live-session/ChatPanel";
import ParticipantsPanel, { Participant } from "@/components/live-session/ParticipantsPanel";
import ControlBar from "@/components/live-session/ControlBar";
import type { Tables } from "@/integrations/supabase/types";

type LiveSession = Tables<"live_sessions">;
type Profile = Tables<"profiles">;

const LiveSessionPage = () => {
  const { classId, sessionId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  // Session state
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  // UI state
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [layout, setLayout] = useState<"grid" | "spotlight">("grid");
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Participant status tracking
  const [participantStatuses, setParticipantStatuses] = useState<Map<string, { isMuted: boolean; isVideoOff: boolean; handRaised: boolean }>>(new Map());

  const isHost = session?.host_id === profile?.id;

  // WebRTC hook
  const {
    localStream,
    screenStream,
    remoteParticipants,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isConnected,
    connectionError,
    connect,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    disconnect,
  } = useWebRTC({
    sessionId: sessionId || "",
    myPeerId: profile?.id || "",
  });

  // Fetch session data
  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!sessionId || !profile) return;

    const channel = supabase.channel(`session-realtime-${sessionId}`)
      // Chat messages
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setChatMessages(prev => [...prev, msg]);
        if (!showChat && msg.userId !== profile.id) {
          setUnreadMessages(prev => prev + 1);
        }
      })
      // Participant status updates
      .on("broadcast", { event: "status-update" }, ({ payload }) => {
        const { peerId, status } = payload as { peerId: string; status: { isMuted: boolean; isVideoOff: boolean; handRaised: boolean } };
        setParticipantStatuses(prev => new Map(prev).set(peerId, status));
      })
      // Hand raise
      .on("broadcast", { event: "hand-raise" }, ({ payload }) => {
        const { peerId, raised } = payload as { peerId: string; raised: boolean };
        setParticipantStatuses(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(peerId) || { isMuted: true, isVideoOff: true, handRaised: false };
          newMap.set(peerId, { ...current, handRaised: raised });
          return newMap;
        });
      })
      // Participant joined/left
      .on("broadcast", { event: "participant-change" }, () => {
        fetchParticipants();
      })
      // Session ended
      .on("broadcast", { event: "session-ended" }, () => {
        toast({
          title: "Phiên học đã kết thúc",
          description: "Host đã kết thúc phiên học",
        });
        handleLeave();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, profile, showChat]);

  // Broadcast status changes
  useEffect(() => {
    if (!sessionId || !profile || !isJoined) return;

    supabase.channel(`session-realtime-${sessionId}`).send({
      type: "broadcast",
      event: "status-update",
      payload: {
        peerId: profile.id,
        status: {
          isMuted: !isAudioEnabled,
          isVideoOff: !isVideoEnabled,
          handRaised,
        },
      },
    });
  }, [isAudioEnabled, isVideoEnabled, handRaised, isJoined]);

  const fetchSessionData = async () => {
    try {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      setSession(data);

      if (data.status === "ended") {
        toast({
          title: "Phiên học đã kết thúc",
          variant: "destructive",
        });
        navigate(`/class/${classId}`);
        return;
      }

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
      .select("*, profiles:user_id(id, full_name, avatar_url)")
      .eq("session_id", sessionId)
      .is("left_at", null);

    if (data) {
      setParticipants(data.map(p => {
        const profileData = p.profiles as Profile;
        const status = participantStatuses.get(p.user_id) || { isMuted: true, isVideoOff: true, handRaised: false };
        return {
          id: p.user_id,
          name: profileData?.full_name || "Unknown",
          avatar: profileData?.avatar_url,
          isHost: session?.host_id === p.user_id,
          isMuted: status.isMuted,
          isVideoOff: status.isVideoOff,
          handRaised: status.handRaised,
          isOnline: true,
        };
      }));
    }
  };

  const joinSession = async () => {
    if (!profile || !sessionId) return;

    setJoining(true);
    try {
      // Add to database
      const { data: existing } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", profile.id)
        .is("left_at", null)
        .maybeSingle();

      if (!existing) {
        await supabase.from("session_participants").insert({
          session_id: sessionId,
          user_id: profile.id,
        });
      }

      // Update session status if host
      if (isHost && session?.status !== "live") {
        await supabase
          .from("live_sessions")
          .update({ status: "live", actual_start: new Date().toISOString() })
          .eq("id", sessionId);
      }

      // Connect WebRTC
      await connect(true, true);
      setIsJoined(true);

      // Broadcast join
      await supabase.channel(`session-realtime-${sessionId}`).send({
        type: "broadcast",
        event: "participant-change",
        payload: { type: "join", peerId: profile.id },
      });

      // Add system message
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: "system",
        userName: "Hệ thống",
        message: `${profile.full_name} đã tham gia phiên học`,
        timestamp: new Date(),
        type: "system",
      }]);

      toast({
        title: "Đã tham gia phiên học",
      });
    } catch (error: any) {
      console.error("Error joining session:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tham gia phiên học",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!profile || !sessionId) return;

    try {
      // Disconnect WebRTC
      await disconnect();

      // Update database
      await supabase
        .from("session_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", profile.id)
        .is("left_at", null);

      // Broadcast leave
      await supabase.channel(`session-realtime-${sessionId}`).send({
        type: "broadcast",
        event: "participant-change",
        payload: { type: "leave", peerId: profile.id },
      });
    } catch (error) {
      console.error("Error leaving session:", error);
    }

    navigate(`/class/${classId}`);
  };

  const handleEndSession = async () => {
    if (!isHost || !sessionId) return;

    try {
      await supabase
        .from("live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);

      // Broadcast session end
      await supabase.channel(`session-realtime-${sessionId}`).send({
        type: "broadcast",
        event: "session-ended",
        payload: {},
      });

      await handleLeave();
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        title: "Lỗi",
        description: "Không thể kết thúc phiên học",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!profile || !sessionId) return;

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: profile.id,
      userName: profile.full_name,
      userAvatar: profile.avatar_url || undefined,
      message,
      timestamp: new Date(),
      type: "message",
    };

    await supabase.channel(`session-realtime-${sessionId}`).send({
      type: "broadcast",
      event: "chat",
      payload: chatMessage,
    });

    setChatMessages(prev => [...prev, chatMessage]);
  };

  const handleToggleHand = () => {
    setHandRaised(!handRaised);
    supabase.channel(`session-realtime-${sessionId}`).send({
      type: "broadcast",
      event: "hand-raise",
      payload: { peerId: profile?.id, raised: !handRaised },
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/class/${classId}/session/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Đã sao chép link",
      description: "Gửi link này để mời người khác tham gia",
    });
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadMessages(0);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Pre-join screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classId}`)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-lg w-full mx-4 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">{session?.title}</h1>
              <p className="text-zinc-400">
                {participants.length} người đang trong phiên học
              </p>
            </div>

            {/* Preview video */}
            <div className="aspect-video bg-zinc-800 rounded-xl overflow-hidden relative">
              {localStream && localStream.getVideoTracks().length > 0 ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(el) => {
                    if (el && localStream) {
                      el.srcObject = localStream;
                      el.play().catch(() => {});
                    }
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-zinc-700 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
                      {profile?.full_name?.charAt(0)}
                    </div>
                    <p className="text-zinc-400">Camera đang tắt</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={joinSession}
                disabled={joining}
                className="px-8"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tham gia...
                  </>
                ) : (
                  "Tham gia ngay"
                )}
              </Button>
            </div>

            {/* Share link */}
            <div className="pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Sao chép link mời
              </Button>
            </div>

            {connectionError && (
              <p className="text-red-400 text-sm">{connectionError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main session view
  return (
    <div className="h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-800/90 backdrop-blur border-b border-zinc-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-white">{session?.title}</h1>
          <Badge variant="default" className="bg-red-500 animate-pulse">
            Trực tiếp
          </Badge>
        </div>
        <div className="text-sm text-zinc-400">
          {participants.length} người tham gia
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className={`h-full ${
            layout === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-fr"
              : "flex flex-col gap-3"
          }`}>
            {/* Screen share (if active) */}
            {isScreenSharing && screenStream && (
              <div className={layout === "spotlight" ? "flex-1" : "col-span-2 row-span-2"}>
                <VideoTile
                  stream={screenStream}
                  name={profile?.full_name || ""}
                  avatar={profile?.avatar_url}
                  isLocal
                  isScreenShare
                  className="w-full h-full min-h-[200px]"
                />
              </div>
            )}

            {/* Local video */}
            <VideoTile
              stream={localStream}
              name={profile?.full_name || ""}
              avatar={profile?.avatar_url}
              isLocal
              isMuted={!isAudioEnabled}
              isVideoOff={!isVideoEnabled}
              handRaised={handRaised}
              isHost={isHost}
              isPinned={pinnedParticipant === profile?.id}
              onPin={() => setPinnedParticipant(pinnedParticipant === profile?.id ? null : profile?.id || null)}
              className={layout === "spotlight" && !isScreenSharing ? "flex-1" : "min-h-[200px]"}
            />

            {/* Remote participants */}
            {remoteParticipants.map(({ peerId, stream }) => {
              const participant = participants.find(p => p.id === peerId);
              const status = participantStatuses.get(peerId);
              return (
                <VideoTile
                  key={peerId}
                  stream={stream}
                  name={participant?.name || "Participant"}
                  avatar={participant?.avatar}
                  isMuted={status?.isMuted}
                  isVideoOff={status?.isVideoOff}
                  handRaised={status?.handRaised}
                  isHost={session?.host_id === peerId}
                  isPinned={pinnedParticipant === peerId}
                  onPin={() => setPinnedParticipant(pinnedParticipant === peerId ? null : peerId)}
                  className="min-h-[200px]"
                />
              );
            })}

            {/* Participants without video streams (just joined) */}
            {participants
              .filter(p => p.id !== profile?.id && !remoteParticipants.find(rp => rp.peerId === p.id))
              .map(participant => (
                <VideoTile
                  key={participant.id}
                  name={participant.name}
                  avatar={participant.avatar}
                  isMuted={participant.isMuted}
                  isVideoOff={participant.isVideoOff}
                  handRaised={participant.handRaised}
                  isHost={participant.isHost}
                  className="min-h-[200px]"
                />
              ))}
          </div>
        </div>

        {/* Side panels */}
        {showParticipants && (
          <div className="w-80 flex-shrink-0">
            <ParticipantsPanel
              participants={participants}
              onClose={() => setShowParticipants(false)}
              isHost={isHost}
              currentUserId={profile?.id || ""}
            />
          </div>
        )}

        {showChat && (
          <div className="w-80 flex-shrink-0">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onClose={() => setShowChat(false)}
              currentUserId={profile?.id || ""}
            />
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        isMuted={!isAudioEnabled}
        isVideoOff={!isVideoEnabled}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        showChat={showChat}
        showParticipants={showParticipants}
        isHost={isHost}
        participantCount={participants.length}
        unreadMessages={unreadMessages}
        onToggleMic={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHand={handleToggleHand}
        onToggleChat={handleToggleChat}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
        onLeave={handleLeave}
        onEndSession={handleEndSession}
        onCopyLink={handleCopyLink}
        onChangeLayout={setLayout}
      />
    </div>
  );
};

export default LiveSessionPage;
