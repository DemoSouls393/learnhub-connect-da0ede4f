import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  PhoneOff,
  MessageSquare,
  Users,
  MoreVertical,
  Copy,
  Settings,
  Grid3X3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  showChat: boolean;
  showParticipants: boolean;
  isHost: boolean;
  participantCount: number;
  unreadMessages?: number;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
  onEndSession?: () => void;
  onCopyLink: () => void;
  onChangeLayout?: (layout: "grid" | "spotlight") => void;
}

const ControlBar = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  handRaised,
  showChat,
  showParticipants,
  isHost,
  participantCount,
  unreadMessages = 0,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onToggleChat,
  onToggleParticipants,
  onLeave,
  onEndSession,
  onCopyLink,
  onChangeLayout,
}: ControlBarProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-zinc-800/95 backdrop-blur border-t border-zinc-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Left section - Meeting info */}
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-700"
              onClick={onCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Sao chép link
            </Button>
          </div>

          {/* Center section - Main controls */}
          <div className="flex items-center gap-2">
            {/* Mic */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className={cn(
                    "rounded-full h-12 w-12",
                    !isMuted && "bg-zinc-700 hover:bg-zinc-600"
                  )}
                  onClick={onToggleMic}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMuted ? "Bật tiếng" : "Tắt tiếng"}
              </TooltipContent>
            </Tooltip>

            {/* Video */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="lg"
                  className={cn(
                    "rounded-full h-12 w-12",
                    !isVideoOff && "bg-zinc-700 hover:bg-zinc-600"
                  )}
                  onClick={onToggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isVideoOff ? "Bật camera" : "Tắt camera"}
              </TooltipContent>
            </Tooltip>

            {/* Screen Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="lg"
                  className={cn(
                    "rounded-full h-12 w-12",
                    !isScreenSharing && "bg-zinc-700 hover:bg-zinc-600"
                  )}
                  onClick={onToggleScreenShare}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
              </TooltipContent>
            </Tooltip>

            {/* Raise Hand */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={handRaised ? "default" : "secondary"}
                  size="lg"
                  className={cn(
                    "rounded-full h-12 w-12",
                    handRaised ? "bg-yellow-500 hover:bg-yellow-600" : "bg-zinc-700 hover:bg-zinc-600"
                  )}
                  onClick={onToggleHand}
                >
                  <Hand className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {handRaised ? "Hạ tay" : "Giơ tay"}
              </TooltipContent>
            </Tooltip>

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full h-12 w-12 bg-zinc-700 hover:bg-zinc-600"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-zinc-800 border-zinc-700">
                <DropdownMenuItem 
                  onClick={() => onChangeLayout?.("grid")}
                  className="text-white hover:bg-zinc-700"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Bố cục lưới
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeLayout?.("spotlight")}
                  className="text-white hover:bg-zinc-700"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Spotlight
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem className="text-white hover:bg-zinc-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Cài đặt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Leave/End call */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-12 px-6"
                  onClick={isHost ? onEndSession : onLeave}
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  {isHost ? "Kết thúc" : "Rời đi"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isHost ? "Kết thúc phiên học" : "Rời khỏi phiên học"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right section - Side panels */}
          <div className="flex items-center gap-2">
            {/* Participants */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showParticipants ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "relative",
                    !showParticipants && "text-zinc-400 hover:text-white hover:bg-zinc-700"
                  )}
                  onClick={onToggleParticipants}
                >
                  <Users className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {participantCount}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Người tham gia</TooltipContent>
            </Tooltip>

            {/* Chat */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showChat ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "relative",
                    !showChat && "text-zinc-400 hover:text-white hover:bg-zinc-700"
                  )}
                  onClick={onToggleChat}
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tin nhắn</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ControlBar;
