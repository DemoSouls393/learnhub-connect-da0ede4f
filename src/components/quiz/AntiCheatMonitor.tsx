import { useState, useEffect, useRef } from "react";
import { Camera, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AntiCheatLog {
  tab_switches: number;
  camera_off_count: number;
  face_not_detected: number;
  warnings: string[];
  timestamps: { event: string; time: string }[];
}

interface AntiCheatMonitorProps {
  submissionId: string;
  cameraRequired: boolean;
  antiCheatEnabled: boolean;
  onViolation?: (type: string, count: number) => void;
}

export default function AntiCheatMonitor({
  submissionId,
  cameraRequired,
  antiCheatEnabled,
  onViolation,
}: AntiCheatMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [cameraOffCount, setCameraOffCount] = useState(0);
  const [log, setLog] = useState<AntiCheatLog>({
    tab_switches: 0,
    camera_off_count: 0,
    face_not_detected: 0,
    warnings: [],
    timestamps: [],
  });
  const { toast } = useToast();

  // Initialize camera
  useEffect(() => {
    if (cameraRequired) {
      initCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraRequired]);

  // Tab visibility detection
  useEffect(() => {
    if (!antiCheatEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        addLogEntry("tab_switch", `Tab switch #${newCount}`);
        onViolation?.("tab_switch", newCount);

        toast({
          title: "Cảnh báo gian lận",
          description: `Bạn đã chuyển tab ${newCount} lần. Hành động này được ghi nhận.`,
          variant: "destructive",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [antiCheatEnabled, tabSwitchCount]);

  // Save log to database periodically
  useEffect(() => {
    if (!submissionId) return;

    const interval = setInterval(() => {
      saveLog();
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [submissionId, log]);

  const initCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      addLogEntry("camera_on", "Camera activated");
    } catch (error) {
      console.error("Camera error:", error);
      setCameraActive(false);
      const newCount = cameraOffCount + 1;
      setCameraOffCount(newCount);
      addLogEntry("camera_error", "Failed to access camera");
      onViolation?.("camera_off", newCount);
    }
  };

  const addLogEntry = (event: string, description: string) => {
    setLog((prev) => ({
      ...prev,
      warnings: [...prev.warnings, description],
      timestamps: [...prev.timestamps, { event, time: new Date().toISOString() }],
      tab_switches: event === "tab_switch" ? prev.tab_switches + 1 : prev.tab_switches,
      camera_off_count: event === "camera_error" || event === "camera_off" ? prev.camera_off_count + 1 : prev.camera_off_count,
    }));
  };

  const saveLog = async () => {
    if (!submissionId) return;

    try {
      await supabase
        .from("submissions")
        .update({
          anti_cheat_log: {
            ...log,
            last_updated: new Date().toISOString(),
          } as unknown as Json,
        })
        .eq("id", submissionId);
    } catch (error) {
      console.error("Error saving anti-cheat log:", error);
    }
  };

  if (!antiCheatEnabled && !cameraRequired) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Camera Preview */}
      {cameraRequired && (
        <div className="relative">
          <div className="w-40 h-30 rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-background">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {/* Camera status indicator */}
            <div className="absolute top-1 right-1">
              {cameraActive ? (
                <div className="flex items-center gap-1 bg-success/90 text-success-foreground px-2 py-0.5 rounded text-xs">
                  <Eye className="h-3 w-3" />
                  REC
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-2 py-0.5 rounded text-xs">
                  <EyeOff className="h-3 w-3" />
                  OFF
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Violations Counter */}
      {antiCheatEnabled && (tabSwitchCount > 0 || cameraOffCount > 0) && (
        <div className="flex flex-col gap-1">
          {tabSwitchCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Chuyển tab: {tabSwitchCount}
            </Badge>
          )}
          {cameraOffCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              Camera tắt: {cameraOffCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
