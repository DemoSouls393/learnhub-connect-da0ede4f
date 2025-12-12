-- Add max_attempts column to assignments table
ALTER TABLE public.assignments 
ADD COLUMN max_attempts integer DEFAULT 1;

-- Create notifications table for real-time notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, success, warning, error
  link text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = notifications.user_id AND p.user_id = auth.uid()
));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = notifications.user_id AND p.user_id = auth.uid()
));

-- Allow insert from authenticated users (for system notifications)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add attempt_number to submissions to track which attempt this is
ALTER TABLE public.submissions 
ADD COLUMN attempt_number integer DEFAULT 1;