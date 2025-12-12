import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
}: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link,
  });

  if (error) {
    console.error("Error creating notification:", error);
  }

  return { error };
}

export async function notifyStudentGraded(
  studentId: string,
  assignmentTitle: string,
  score: number,
  totalPoints: number,
  classId: string,
  assignmentId: string
) {
  return createNotification({
    userId: studentId,
    title: "Bài làm đã được chấm điểm",
    message: `Bạn đạt ${score}/${totalPoints} điểm cho bài "${assignmentTitle}"`,
    type: "success",
    link: `/class/${classId}/assignment/${assignmentId}`,
  });
}

export async function notifyNewAssignment(
  studentId: string,
  assignmentTitle: string,
  className: string,
  classId: string,
  assignmentId: string
) {
  return createNotification({
    userId: studentId,
    title: "Bài tập mới",
    message: `Giáo viên đã giao bài "${assignmentTitle}" trong lớp ${className}`,
    type: "info",
    link: `/class/${classId}/assignment/${assignmentId}`,
  });
}

export async function notifyNewAnnouncement(
  studentId: string,
  announcementTitle: string,
  className: string,
  classId: string
) {
  return createNotification({
    userId: studentId,
    title: "Thông báo mới",
    message: `${className}: ${announcementTitle}`,
    type: "info",
    link: `/class/${classId}`,
  });
}

export async function notifyTeacherSubmission(
  teacherId: string,
  studentName: string,
  assignmentTitle: string,
  classId: string,
  assignmentId: string
) {
  return createNotification({
    userId: teacherId,
    title: "Học sinh nộp bài",
    message: `${studentName} đã nộp bài "${assignmentTitle}"`,
    type: "info",
    link: `/class/${classId}/assignment/${assignmentId}`,
  });
}
