import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Hand, 
  Crown,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  handRaised: boolean;
  isOnline: boolean;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  onClose: () => void;
  isHost: boolean;
  currentUserId: string;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onLowerHand?: (participantId: string) => void;
}

const ParticipantsPanel = ({
  participants,
  onClose,
  isHost,
  currentUserId,
  onMuteParticipant,
  onRemoveParticipant,
  onLowerHand,
}: ParticipantsPanelProps) => {
  const hosts = participants.filter(p => p.isHost);
  const others = participants.filter(p => !p.isHost);
  const raisedHands = participants.filter(p => p.handRaised);

  const ParticipantItem = ({ participant }: { participant: Participant }) => (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-zinc-700/50 group">
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={participant.avatar || undefined} />
          <AvatarFallback className="text-sm bg-zinc-600">
            {participant.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {participant.isOnline && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-800" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">
          {participant.name}
          {participant.id === currentUserId && " (Bạn)"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {participant.isHost && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-500/20 text-yellow-400">
              Host
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {participant.handRaised && (
          <div className="p-1 bg-yellow-500/20 rounded">
            <Hand className="h-3.5 w-3.5 text-yellow-400" />
          </div>
        )}
        <div className={`p-1 rounded ${participant.isMuted ? "bg-red-500/20" : "bg-green-500/20"}`}>
          {participant.isMuted ? (
            <MicOff className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Mic className="h-3.5 w-3.5 text-green-400" />
          )}
        </div>
        <div className={`p-1 rounded ${participant.isVideoOff ? "bg-red-500/20" : "bg-green-500/20"}`}>
          {participant.isVideoOff ? (
            <VideoOff className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Video className="h-3.5 w-3.5 text-green-400" />
          )}
        </div>

        {isHost && participant.id !== currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white hover:bg-zinc-600"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
              <DropdownMenuItem
                onClick={() => onMuteParticipant?.(participant.id)}
                className="text-white hover:bg-zinc-700"
              >
                {participant.isMuted ? "Bật tiếng" : "Tắt tiếng"}
              </DropdownMenuItem>
              {participant.handRaised && (
                <DropdownMenuItem
                  onClick={() => onLowerHand?.(participant.id)}
                  className="text-white hover:bg-zinc-700"
                >
                  Hạ tay
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onRemoveParticipant?.(participant.id)}
                className="text-red-400 hover:bg-zinc-700"
              >
                Xóa khỏi phiên học
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-800 border-l border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h3 className="font-semibold text-white">
          Người tham gia ({participants.length})
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {/* Raised hands */}
        {raisedHands.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2 px-1">
              Giơ tay ({raisedHands.length})
            </p>
            {raisedHands.map(p => (
              <ParticipantItem key={p.id} participant={p} />
            ))}
          </div>
        )}

        {/* Hosts */}
        {hosts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2 px-1 flex items-center gap-1">
              <Crown className="h-3 w-3" /> Host
            </p>
            {hosts.map(p => (
              <ParticipantItem key={p.id} participant={p} />
            ))}
          </div>
        )}

        {/* Other participants */}
        {others.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2 px-1">
              Người tham gia ({others.length})
            </p>
            {others.map(p => (
              <ParticipantItem key={p.id} participant={p} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ParticipantsPanel;
