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
  PenTool,
  CircleDot,
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
  isRecording?: boolean;
  showWhiteboard?: boolean;
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
  onToggleRecording?: () => void;
  onToggleWhiteboard?: () => void;
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
  isRecording = false,
  showWhiteboard = false,
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
  onToggleRecording,
  onToggleWhiteboard,
}: ControlBarProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Left section */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Sao chép link
            </Button>
          </div>

          {/* Center section - Main controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full h-12 w-12"
                  onClick={onToggleMic}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Bật tiếng" : "Tắt tiếng"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full h-12 w-12"
                  onClick={onToggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isVideoOff ? "Bật camera" : "Tắt camera"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="lg"
                  className="rounded-full h-12 w-12"
                  onClick={onToggleScreenShare}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isScreenSharing ? "Dừng chia sẻ" : "Chia sẻ màn hình"}</TooltipContent>
            </Tooltip>

            {isHost && onToggleWhiteboard && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showWhiteboard ? "default" : "secondary"}
                    size="lg"
                    className="rounded-full h-12 w-12"
                    onClick={onToggleWhiteboard}
                  >
                    <PenTool className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showWhiteboard ? "Đóng bảng" : "Bảng trắng"}</TooltipContent>
              </Tooltip>
            )}

            {isHost && onToggleRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? "destructive" : "secondary"}
                    size="lg"
                    className={cn("rounded-full h-12 w-12", isRecording && "animate-pulse")}
                    onClick={onToggleRecording}
                  >
                    <CircleDot className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRecording ? "Dừng ghi" : "Ghi hình"}</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={handRaised ? "default" : "secondary"}
                  size="lg"
                  className={cn("rounded-full h-12 w-12", handRaised && "bg-warning hover:bg-warning/90")}
                  onClick={onToggleHand}
                >
                  <Hand className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{handRaised ? "Hạ tay" : "Giơ tay"}</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="lg" className="rounded-full h-12 w-12">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-card border-border">
                <DropdownMenuItem onClick={() => onChangeLayout?.("grid")}>
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Bố cục lưới
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeLayout?.("spotlight")}>
                  <Monitor className="h-4 w-4 mr-2" />
                  Spotlight
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Cài đặt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
              <TooltipContent>{isHost ? "Kết thúc phiên học" : "Rời khỏi phiên học"}</TooltipContent>
            </Tooltip>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showParticipants ? "default" : "ghost"}
                  size="icon"
                  className="relative"
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showChat ? "default" : "ghost"}
                  size="icon"
                  className="relative"
                  onClick={onToggleChat}
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
