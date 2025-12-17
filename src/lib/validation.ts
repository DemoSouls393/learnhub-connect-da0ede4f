import { z } from 'zod';

// Class validation schemas
export const classSchema = z.object({
  name: z.string().trim().min(1, 'Tên lớp không được trống').max(100, 'Tên lớp tối đa 100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional().nullable(),
  subject: z.string().trim().max(100, 'Môn học tối đa 100 ký tự').optional().nullable(),
});

// Announcement validation schemas
export const announcementSchema = z.object({
  title: z.string().trim().max(200, 'Tiêu đề tối đa 200 ký tự').optional(),
  content: z.string().trim().min(1, 'Nội dung không được trống').max(5000, 'Nội dung tối đa 5000 ký tự'),
});

// Material validation schemas
export const materialSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').optional().nullable(),
});

// Class code validation
export const classCodeSchema = z.string()
  .trim()
  .length(6, 'Mã lớp phải có 6 ký tự')
  .regex(/^[A-Z0-9]+$/, 'Mã lớp chỉ chứa chữ cái và số');

// File validation
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/zip',
  'application/x-rar-compressed',
];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File quá lớn. Kích thước tối đa là 50MB' };
  }
  // Allow most common file types
  return { valid: true };
}

// URL/Link validation for notifications
export function isInternalLink(link: string): boolean {
  // Check if it's a relative path
  if (link.startsWith('/') && !link.startsWith('//')) {
    return true;
  }
  // Check if it's the same origin
  try {
    const url = new URL(link, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function sanitizeInternalPath(link: string): string {
  // Only allow internal paths that start with /
  if (!link.startsWith('/')) {
    return '/';
  }
  // Remove any potential protocol injection
  const sanitized = link.replace(/^\/+/, '/');
  // Only allow alphanumeric, hyphens, underscores, and slashes
  if (!/^\/[a-zA-Z0-9\-_\/]*$/.test(sanitized)) {
    return '/';
  }
  return sanitized;
}

// Helper to validate and get validation errors
export function getValidationErrors(schema: z.ZodSchema, data: unknown): string | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues;
    return issues[0]?.message || 'Dữ liệu không hợp lệ';
  }
  return null;
}
