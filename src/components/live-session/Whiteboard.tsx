import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Rect, Circle, Line, IText } from 'fabric';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Pencil,
  Square,
  Circle as CircleIcon,
  Type,
  Eraser,
  Trash2,
  Download,
  MousePointer2,
  Minus,
  Palette,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type Tool = 'select' | 'draw' | 'rectangle' | 'circle' | 'line' | 'text' | 'eraser';

interface WhiteboardProps {
  onClose: () => void;
  isHost: boolean;
  sessionId: string;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const Whiteboard = ({ onClose, isHost, sessionId }: WhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('draw');
  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(3);
  const isDrawing = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight - 60,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight - 60,
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'draw' || activeTool === 'eraser';
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#ffffff' : activeColor;
      fabricCanvas.freeDrawingBrush.width = activeTool === 'eraser' ? brushSize * 3 : brushSize;
    }

    if (activeTool === 'select') {
      fabricCanvas.selection = true;
    } else {
      fabricCanvas.selection = false;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Handle shape drawing
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (opt: any) => {
      if (['rectangle', 'circle', 'line'].includes(activeTool)) {
        isDrawing.current = true;
        const pointer = fabricCanvas.getPointer(opt.e);
        startPoint.current = { x: pointer.x, y: pointer.y };
      }
    };

    const handleMouseUp = (opt: any) => {
      if (!isDrawing.current || !startPoint.current) return;
      isDrawing.current = false;

      const pointer = fabricCanvas.getPointer(opt.e);
      const { x: startX, y: startY } = startPoint.current;
      const endX = pointer.x;
      const endY = pointer.y;

      let shape;

      if (activeTool === 'rectangle') {
        shape = new Rect({
          left: Math.min(startX, endX),
          top: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
        shape = new Circle({
          left: Math.min(startX, endX),
          top: Math.min(startY, endY),
          radius,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      } else if (activeTool === 'line') {
        shape = new Line([startX, startY, endX, endY], {
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      }

      if (shape) {
        fabricCanvas.add(shape);
        fabricCanvas.renderAll();
      }

      startPoint.current = null;
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, activeTool, activeColor, brushSize]);

  const handleAddText = useCallback(() => {
    if (!fabricCanvas) return;

    const text = new IText('Nhập văn bản...', {
      left: fabricCanvas.getWidth() / 2 - 100,
      top: fabricCanvas.getHeight() / 2,
      fontFamily: 'Inter, sans-serif',
      fill: activeColor,
      fontSize: 24,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    text.enterEditing();
    fabricCanvas.renderAll();
    setActiveTool('select');
  }, [fabricCanvas, activeColor]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const handleExport = useCallback(() => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, [fabricCanvas, sessionId]);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Chọn' },
    { id: 'draw', icon: Pencil, label: 'Vẽ' },
    { id: 'line', icon: Minus, label: 'Đường thẳng' },
    { id: 'rectangle', icon: Square, label: 'Hình chữ nhật' },
    { id: 'circle', icon: CircleIcon, label: 'Hình tròn' },
    { id: 'text', icon: Type, label: 'Văn bản', action: handleAddText },
    { id: 'eraser', icon: Eraser, label: 'Tẩy' },
  ] as const;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                    size="icon"
                    className={cn(
                      'h-9 w-9',
                      activeTool === tool.id && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => {
                      if ('action' in tool && tool.action) {
                        tool.action();
                      } else {
                        setActiveTool(tool.id as Tool);
                      }
                    }}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.label}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <div
                  className="w-5 h-5 rounded-full border-2 border-border"
                  style={{ backgroundColor: activeColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                      activeColor === color ? 'border-primary scale-110' : 'border-border'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setActiveColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Brush size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium">Kích thước: {brushSize}px</p>
                <Slider
                  value={[brushSize]}
                  onValueChange={([value]) => setBrushSize(value)}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tải xuống</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa tất cả</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default Whiteboard;
