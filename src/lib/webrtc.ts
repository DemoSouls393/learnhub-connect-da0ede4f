// WebRTC P2P Connection Manager with Supabase Signaling
import { supabase } from "@/integrations/supabase/client";

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate";
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private sessionId: string;
  private myPeerId: string;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  
  private onRemoteStreamCallback?: (peerId: string, stream: MediaStream) => void;
  private onPeerDisconnectedCallback?: (peerId: string) => void;
  private onParticipantUpdateCallback?: () => void;

  constructor(sessionId: string, myPeerId: string) {
    this.sessionId = sessionId;
    this.myPeerId = myPeerId;
  }

  // Initialize signaling channel
  async initSignaling() {
    console.log("[WebRTC] Initializing signaling for session:", this.sessionId);
    
    this.channel = supabase.channel(`webrtc-${this.sessionId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const message = payload as SignalingMessage;
        if (message.to === this.myPeerId) {
          await this.handleSignalingMessage(message);
        }
      })
      .on("broadcast", { event: "peer-joined" }, async ({ payload }) => {
        const { peerId } = payload as { peerId: string };
        if (peerId !== this.myPeerId) {
          console.log("[WebRTC] Peer joined:", peerId);
          // Initiate connection to new peer
          await this.createOffer(peerId);
        }
      })
      .on("broadcast", { event: "peer-left" }, ({ payload }) => {
        const { peerId } = payload as { peerId: string };
        console.log("[WebRTC] Peer left:", peerId);
        this.removePeer(peerId);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("[WebRTC] Signaling channel subscribed");
          // Announce joining
          await this.channel?.send({
            type: "broadcast",
            event: "peer-joined",
            payload: { peerId: this.myPeerId },
          });
        }
      });
  }

  // Initialize local media stream
  async initLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[WebRTC] Got local stream:", this.localStream.id);
      return this.localStream;
    } catch (error) {
      console.error("[WebRTC] Error getting local stream:", error);
      throw error;
    }
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });

      // Replace video track in all peer connections
      const videoTrack = this.screenStream.getVideoTracks()[0];
      this.peers.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (error) {
      console.error("[WebRTC] Error starting screen share:", error);
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;

      // Restore camera video track
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.peers.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
      }
    }
  }

  // Create peer connection
  private createPeerConnection(peerId: string): RTCPeerConnection {
    console.log("[WebRTC] Creating peer connection for:", peerId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignalingMessage({
          type: "ice-candidate",
          from: this.myPeerId,
          to: peerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        this.removePeer(peerId);
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track from:", peerId);
      const stream = event.streams[0];
      if (stream) {
        this.remoteStreams.set(peerId, stream);
        this.onRemoteStreamCallback?.(peerId, stream);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  // Create and send offer
  private async createOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await this.sendSignalingMessage({
        type: "offer",
        from: this.myPeerId,
        to: peerId,
        data: offer,
      });
    } catch (error) {
      console.error("[WebRTC] Error creating offer:", error);
    }
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(message: SignalingMessage) {
    console.log("[WebRTC] Received signaling message:", message.type, "from:", message.from);

    switch (message.type) {
      case "offer":
        await this.handleOffer(message.from, message.data as RTCSessionDescriptionInit);
        break;
      case "answer":
        await this.handleAnswer(message.from, message.data as RTCSessionDescriptionInit);
        break;
      case "ice-candidate":
        await this.handleIceCandidate(message.from, message.data as RTCIceCandidateInit);
        break;
    }
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(peerId);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await this.sendSignalingMessage({
        type: "answer",
        from: this.myPeerId,
        to: peerId,
        data: answer,
      });
    } catch (error) {
      console.error("[WebRTC] Error handling offer:", error);
    }
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("[WebRTC] Error handling answer:", error);
      }
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("[WebRTC] Error handling ICE candidate:", error);
      }
    }
  }

  private async sendSignalingMessage(message: SignalingMessage) {
    await this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: message,
    });
  }

  private removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.onPeerDisconnectedCallback?.(peerId);
  }

  // Toggle local video - re-acquire camera if needed
  async toggleVideo(enabled: boolean): Promise<MediaStream | null> {
    if (enabled) {
      // Re-acquire camera
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // If we have an existing local stream, add the new track to it
        if (this.localStream) {
          // First, remove any existing video tracks
          this.localStream.getVideoTracks().forEach(track => {
            track.stop();
            this.localStream?.removeTrack(track);
          });
          // Add the new video track
          this.localStream.addTrack(newVideoTrack);
        } else {
          // Create a new stream with the video track
          this.localStream = newStream;
        }
        
        // Replace track in all peer connections
        this.peers.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else if (this.localStream) {
            pc.addTrack(newVideoTrack, this.localStream);
          }
        });
        
        console.log("[WebRTC] Camera re-acquired successfully");
        return this.localStream;
      } catch (error) {
        console.error("[WebRTC] Error re-acquiring camera:", error);
        throw error;
      }
    } else {
      // Stop and remove video tracks
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
        
        // Notify peers by replacing with null
        this.peers.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(null);
          }
        });
        
        console.log("[WebRTC] Camera stopped");
      }
      return this.localStream;
    }
  }

  // Toggle local audio
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Set callbacks
  onRemoteStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onPeerDisconnected(callback: (peerId: string) => void) {
    this.onPeerDisconnectedCallback = callback;
  }

  onParticipantUpdate(callback: () => void) {
    this.onParticipantUpdateCallback = callback;
  }

  // Get remote streams
  getRemoteStreams(): Map<string, MediaStream> {
    return this.remoteStreams;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  // Cleanup
  async disconnect() {
    console.log("[WebRTC] Disconnecting...");

    // Announce leaving
    await this.channel?.send({
      type: "broadcast",
      event: "peer-left",
      payload: { peerId: this.myPeerId },
    });

    // Close all peer connections
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Stop screen share
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    // Unsubscribe from channel
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
