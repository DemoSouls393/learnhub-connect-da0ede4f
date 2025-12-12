import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MicOff, Hand, Crown, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  avatar?: string | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  handRaised?: boolean;
  isHost?: boolean;
  isPinned?: boolean;
  isScreenShare?: boolean;
  onPin?: () => void;
  className?: string;
}

const VideoTile = ({
  stream,
  name,
  avatar,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  handRaised = false,
  isHost = false,
  isPinned = false,
  isScreenShare = false,
  onPin,
  className,
}: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !isVideoOff;

  return (
    <div
      className={cn(
        "relative bg-zinc-800 rounded-xl overflow-hidden group cursor-pointer transition-all",
        isPinned && "ring-2 ring-primary",
        className
      )}
      onClick={onPin}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !isScreenShare && "transform scale-x-[-1]"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
          <Avatar className="h-20 w-20 md:h-24 md:w-24">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="text-2xl md:text-3xl bg-primary text-primary-foreground">
              {name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Name and badges */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[120px]">
              {name}
              {isLocal && " (Bạn)"}
            </span>
            {isHost && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5">
                <Crown className="h-3 w-3" />
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMuted && (
              <Badge variant="destructive" className="p-1">
                <MicOff className="h-3 w-3" />
              </Badge>
            )}
            {handRaised && (
              <Badge className="bg-yellow-500 p-1">
                <Hand className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/80">
            <Pin className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* Screen share indicator */}
      {isScreenShare && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary">Đang chia sẻ màn hình</Badge>
        </div>
      )}
    </div>
  );
};

export default VideoTile;
