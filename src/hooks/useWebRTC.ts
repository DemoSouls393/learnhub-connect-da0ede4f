import { useState, useEffect, useRef, useCallback } from "react";
import { WebRTCManager } from "@/lib/webrtc";

interface RemoteParticipant {
  peerId: string;
  stream: MediaStream;
}

interface UseWebRTCOptions {
  sessionId: string;
  myPeerId: string;
  autoConnect?: boolean;
}

export const useWebRTC = ({ sessionId, myPeerId, autoConnect = false }: UseWebRTCOptions) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const webrtcRef = useRef<WebRTCManager | null>(null);

  // Initialize WebRTC manager
  useEffect(() => {
    if (!sessionId || !myPeerId) return;

    const manager = new WebRTCManager(sessionId, myPeerId);
    webrtcRef.current = manager;

    // Set up callbacks
    manager.onRemoteStream((peerId, stream) => {
      console.log("[useWebRTC] Remote stream received:", peerId);
      setRemoteParticipants(prev => {
        const exists = prev.find(p => p.peerId === peerId);
        if (exists) {
          return prev.map(p => p.peerId === peerId ? { ...p, stream } : p);
        }
        return [...prev, { peerId, stream }];
      });
    });

    manager.onPeerDisconnected((peerId) => {
      console.log("[useWebRTC] Peer disconnected:", peerId);
      setRemoteParticipants(prev => prev.filter(p => p.peerId !== peerId));
    });

    if (autoConnect) {
      connect();
    }

    return () => {
      manager.disconnect();
    };
  }, [sessionId, myPeerId]);

  // Connect to session
  const connect = useCallback(async (video: boolean = true, audio: boolean = true) => {
    if (!webrtcRef.current) return;

    try {
      setConnectionError(null);
      
      // Get local media
      const stream = await webrtcRef.current.initLocalStream(video, audio);
      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);

      // Initialize signaling
      await webrtcRef.current.initSignaling();
      setIsConnected(true);
      
      console.log("[useWebRTC] Connected to session");
    } catch (error: any) {
      console.error("[useWebRTC] Connection error:", error);
      setConnectionError(error.message || "Failed to connect");
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (webrtcRef.current) {
      const newState = !isVideoEnabled;
      try {
        const updatedStream = await webrtcRef.current.toggleVideo(newState);
        setIsVideoEnabled(newState);
        
        // Force update local stream reference to trigger re-render
        if (updatedStream) {
          // Create a new MediaStream reference to force React to detect the change
          const newStreamRef = new MediaStream(updatedStream.getTracks());
          setLocalStream(newStreamRef);
        } else {
          setLocalStream(null);
        }
        
        console.log("[useWebRTC] Video toggled:", newState);
      } catch (error) {
        console.error("[useWebRTC] Toggle video error:", error);
      }
    }
  }, [isVideoEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (webrtcRef.current) {
      const newState = !isAudioEnabled;
      webrtcRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
    }
  }, [isAudioEnabled]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!webrtcRef.current) return;

    try {
      const stream = await webrtcRef.current.startScreenShare();
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Listen for screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("[useWebRTC] Screen share error:", error);
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (webrtcRef.current) {
      await webrtcRef.current.stopScreenShare();
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (webrtcRef.current) {
      await webrtcRef.current.disconnect();
      setLocalStream(null);
      setScreenStream(null);
      setRemoteParticipants([]);
      setIsConnected(false);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setIsScreenSharing(false);
    }
  }, []);

  return {
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
  };
};
