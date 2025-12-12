import { useState, useEffect, useRef } from "react";
import { Camera, AlertTriangle, CheckCircle, VideoOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CameraVerificationProps {
  onVerified: () => void;
  onSkip?: () => void;
  required?: boolean;
}

export default function CameraVerification({ onVerified, onSkip, required = false }: CameraVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"pending" | "requesting" | "granted" | "denied" | "error">("pending");
  const [countdown, setCountdown] = useState(3);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const requestCamera = async () => {
    setStatus("requesting");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStatus("granted");

      // Start countdown for verification
      let count = 3;
      const timer = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count === 0) {
          clearInterval(timer);
          toast({
            title: "Xác minh thành công",
            description: "Camera đã được kích hoạt. Bạn có thể bắt đầu làm bài.",
          });
          onVerified();
        }
      }, 1000);
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.name === "NotAllowedError") {
        setStatus("denied");
        toast({
          title: "Quyền truy cập bị từ chối",
          description: "Vui lòng cho phép truy cập camera để tiếp tục",
          variant: "destructive",
        });
      } else {
        setStatus("error");
        toast({
          title: "Lỗi camera",
          description: "Không thể truy cập camera. Vui lòng kiểm tra thiết bị.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Xác minh Camera</CardTitle>
          <CardDescription>
            Bài kiểm tra này yêu cầu camera để đảm bảo tính trung thực
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {status === "granted" ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">{countdown}</div>
                    <p className="text-sm">Đang xác minh...</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {status === "requesting" ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : status === "denied" ? (
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 mx-auto mb-2 text-destructive" />
                    <p className="text-sm text-destructive">Quyền truy cập bị từ chối</p>
                  </div>
                ) : status === "error" ? (
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-warning" />
                    <p className="text-sm text-muted-foreground">Không thể truy cập camera</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Camera chưa được kích hoạt</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <p>Đảm bảo khuôn mặt của bạn được nhìn thấy rõ ràng</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <p>Camera sẽ được bật trong suốt quá trình làm bài</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <p>Việc tắt camera hoặc rời khỏi sẽ được ghi nhận</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {status !== "granted" && (
              <Button
                onClick={requestCamera}
                disabled={status === "requesting"}
                className="w-full"
                variant="hero"
              >
                {status === "requesting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang yêu cầu quyền...
                  </>
                ) : status === "denied" || status === "error" ? (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Thử lại
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Bật Camera
                  </>
                )}
              </Button>
            )}
            
            {!required && onSkip && (
              <Button variant="outline" onClick={onSkip} className="w-full">
                Bỏ qua (không khuyến khích)
              </Button>
            )}
          </div>

          {/* Warning */}
          {required && (status === "denied" || status === "error") && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                Bạn không thể làm bài kiểm tra mà không bật camera. Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
