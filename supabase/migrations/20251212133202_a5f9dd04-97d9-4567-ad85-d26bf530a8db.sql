-- Create storage bucket for materials
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('materials', 'materials', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for materials bucket
CREATE POLICY "Anyone can view materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials');

CREATE POLICY "Teachers can upload materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can delete materials"
ON storage.objects FOR DELETE
USING (bucket_id = 'materials' AND auth.uid() IS NOT NULL);

-- Enable realtime for assignments and submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;