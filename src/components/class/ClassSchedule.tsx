import { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, Clock, Video, MapPin, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, startOfWeek, addDays, isToday, isFuture } from "date-fns";
import { vi } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Schedule = Tables<"class_schedule">;

interface ClassScheduleProps {
  classId: string;
  isTeacher: boolean;
}

export default function ClassSchedule({ classId, isTeacher }: ClassScheduleProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_online_meeting: false,
    meeting_link: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
    
    const channel = supabase
      .channel(`schedule-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "class_schedule", filter: `class_id=eq.${classId}` }, () => {
        fetchSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("class_schedule")
        .select("*")
        .eq("class_id", classId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSchedule.title || !newSchedule.start_time || !newSchedule.end_time) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("class_schedule").insert({
        class_id: classId,
        title: newSchedule.title,
        description: newSchedule.description || null,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        is_online_meeting: newSchedule.is_online_meeting,
        meeting_link: newSchedule.meeting_link || null,
      });

      if (error) throw error;

      toast({ title: "Thành công", description: "Đã tạo lịch học mới" });
      setIsCreateOpen(false);
      setNewSchedule({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        is_online_meeting: false,
        meeting_link: "",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch học này?")) return;

    try {
      const { error } = await supabase.from("class_schedule").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Thành công", description: "Đã xóa lịch học" });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get schedules for selected date
  const selectedDateSchedules = schedules.filter((s) =>
    isSameDay(new Date(s.start_time), selectedDate)
  );

  // Get dates with schedules for calendar highlighting
  const datesWithSchedules = schedules.map((s) => new Date(s.start_time));

  // Get upcoming schedules
  const upcomingSchedules = schedules
    .filter((s) => isFuture(new Date(s.start_time)) || isToday(new Date(s.start_time)))
    .slice(0, 5);

  // Generate week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Lịch học</h2>
          <p className="text-muted-foreground">Quản lý thời khóa biểu lớp học</p>
        </div>
        {isTeacher && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Thêm lịch học
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm lịch học mới</DialogTitle>
                <DialogDescription>Tạo buổi học hoặc sự kiện mới cho lớp</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tiêu đề *</Label>
                  <Input
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                    placeholder="VD: Buổi học Chương 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                    placeholder="Nội dung buổi học..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bắt đầu *</Label>
                    <Input
                      type="datetime-local"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kết thúc *</Label>
                    <Input
                      type="datetime-local"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Học trực tuyến</Label>
                    <p className="text-sm text-muted-foreground">Buổi học online qua video call</p>
                  </div>
                  <Switch
                    checked={newSchedule.is_online_meeting}
                    onCheckedChange={(checked) => setNewSchedule({ ...newSchedule, is_online_meeting: checked })}
                  />
                </div>
                {newSchedule.is_online_meeting && (
                  <div className="space-y-2">
                    <Label>Link meeting</Label>
                    <Input
                      value={newSchedule.meeting_link}
                      onChange={(e) => setNewSchedule({ ...newSchedule, meeting_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Đang tạo..." : "Tạo lịch học"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Lịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasSchedule: datesWithSchedules,
              }}
              modifiersClassNames={{
                hasSchedule: "bg-primary/20 text-primary font-bold",
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Day View */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })}
            </CardTitle>
            <CardDescription>
              {selectedDateSchedules.length} buổi học
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Không có lịch học nào trong ngày này</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{schedule.title}</h4>
                          {schedule.is_online_meeting && (
                            <Badge variant="secondary">
                              <Video className="h-3 w-3 mr-1" />
                              Online
                            </Badge>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {schedule.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(schedule.start_time), "HH:mm")} - {format(new Date(schedule.end_time), "HH:mm")}
                          </span>
                          {schedule.meeting_link && (
                            <a
                              href={schedule.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Video className="h-4 w-4" />
                              Vào lớp
                            </a>
                          )}
                        </div>
                      </div>
                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch học sắp tới</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSchedules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Không có lịch học nào sắp tới</p>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold text-primary">
                        {format(new Date(schedule.start_time), "dd")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(schedule.start_time), "MMM", { locale: vi })}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{schedule.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(schedule.start_time), "HH:mm")} - {format(new Date(schedule.end_time), "HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.is_online_meeting && (
                      <Badge variant="outline">
                        <Video className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    )}
                    {isToday(new Date(schedule.start_time)) && (
                      <Badge variant="default">Hôm nay</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
