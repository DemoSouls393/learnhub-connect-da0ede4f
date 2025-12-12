import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  type?: "message" | "system";
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
  currentUserId: string;
}

const ChatPanel = ({ messages, onSendMessage, onClose, currentUserId }: ChatPanelProps) => {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-800 border-l border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h3 className="font-semibold text-white">Tin nhắn</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-8">
              Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "system" ? (
                  <p className="text-center text-zinc-500 text-xs py-2">
                    {msg.message}
                  </p>
                ) : (
                  <div className={`flex gap-2 ${msg.userId === currentUserId ? "flex-row-reverse" : ""}`}>
                    {msg.userId !== currentUserId && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.userAvatar} />
                        <AvatarFallback className="text-xs bg-zinc-600">
                          {msg.userName?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] ${msg.userId === currentUserId ? "items-end" : ""}`}>
                      {msg.userId !== currentUserId && (
                        <p className="text-xs text-zinc-400 mb-1">{msg.userName}</p>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          msg.userId === currentUserId
                            ? "bg-primary text-primary-foreground"
                            : "bg-zinc-700 text-white"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {format(new Date(msg.timestamp), "HH:mm", { locale: vi })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-zinc-700">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 focus-visible:ring-primary"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
