-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create classes table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    class_code TEXT UNIQUE NOT NULL,
    cover_image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create class_members table (students enrolled in classes)
CREATE TABLE public.class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(class_id, student_id)
);

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'quiz', 'exam')),
    due_date TIMESTAMP WITH TIME ZONE,
    total_points INTEGER DEFAULT 100,
    is_published BOOLEAN DEFAULT false,
    allow_late_submission BOOLEAN DEFAULT false,
    time_limit_minutes INTEGER,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    anti_cheat_enabled BOOLEAN DEFAULT false,
    camera_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'essay', 'fill_blank', 'drag_drop')),
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    correct_answer TEXT,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'graded')) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(5,2),
    feedback TEXT,
    answers JSONB,
    anti_cheat_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(assignment_id, student_id)
);

-- Create materials table (documents, resources)
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type TEXT,
    folder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create class_schedule table
CREATE TABLE public.class_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_online_meeting BOOLEAN DEFAULT false,
    meeting_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create live_sessions table
CREATE TABLE public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled',
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create session_participants table
CREATE TABLE public.session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER DEFAULT 0,
    camera_off_count INTEGER DEFAULT 0,
    mic_off_count INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Create function to get user's profile id
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Create function to check if user is teacher of a class
CREATE OR REPLACE FUNCTION public.is_class_teacher(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.profiles p ON c.teacher_id = p.id
    WHERE c.id = class_uuid AND p.user_id = auth.uid()
  )
$$;

-- Create function to check if user is member of a class
CREATE OR REPLACE FUNCTION public.is_class_member(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.profiles p ON cm.student_id = p.id
    WHERE cm.class_id = class_uuid AND p.user_id = auth.uid()
  )
$$;

-- Create function to check if user has access to a class (teacher or member)
CREATE OR REPLACE FUNCTION public.has_class_access(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_class_teacher(class_uuid) OR public.is_class_member(class_uuid)
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for classes
CREATE POLICY "Anyone can view active classes" ON public.classes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can create classes" ON public.classes
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = teacher_id AND user_id = auth.uid() AND role = 'teacher')
    );

CREATE POLICY "Teachers can update their classes" ON public.classes
    FOR UPDATE USING (public.is_class_teacher(id));

CREATE POLICY "Teachers can delete their classes" ON public.classes
    FOR DELETE USING (public.is_class_teacher(id));

-- RLS Policies for class_members
CREATE POLICY "Class participants can view members" ON public.class_members
    FOR SELECT USING (public.has_class_access(class_id));

CREATE POLICY "Students can join classes" ON public.class_members
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND user_id = auth.uid() AND role = 'student')
    );

CREATE POLICY "Teachers can manage members" ON public.class_members
    FOR DELETE USING (public.is_class_teacher(class_id));

-- RLS Policies for announcements
CREATE POLICY "Class participants can view announcements" ON public.announcements
    FOR SELECT USING (public.has_class_access(class_id));

CREATE POLICY "Teachers can create announcements" ON public.announcements
    FOR INSERT WITH CHECK (public.is_class_teacher(class_id));

CREATE POLICY "Teachers can update announcements" ON public.announcements
    FOR UPDATE USING (public.is_class_teacher(class_id));

CREATE POLICY "Teachers can delete announcements" ON public.announcements
    FOR DELETE USING (public.is_class_teacher(class_id));

-- RLS Policies for assignments
CREATE POLICY "Class participants can view published assignments" ON public.assignments
    FOR SELECT USING (
        public.has_class_access(class_id) AND (is_published = true OR public.is_class_teacher(class_id))
    );

CREATE POLICY "Teachers can create assignments" ON public.assignments
    FOR INSERT WITH CHECK (public.is_class_teacher(class_id));

CREATE POLICY "Teachers can update assignments" ON public.assignments
    FOR UPDATE USING (public.is_class_teacher(class_id));

CREATE POLICY "Teachers can delete assignments" ON public.assignments
    FOR DELETE USING (public.is_class_teacher(class_id));

-- RLS Policies for questions
CREATE POLICY "Users can view questions for accessible assignments" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments a 
            WHERE a.id = assignment_id AND public.has_class_access(a.class_id)
        )
    );

CREATE POLICY "Teachers can manage questions" ON public.questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assignments a 
            WHERE a.id = assignment_id AND public.is_class_teacher(a.class_id)
        )
    );

-- RLS Policies for submissions
CREATE POLICY "Students can view own submissions" ON public.submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND user_id = auth.uid())
    );

CREATE POLICY "Teachers can view class submissions" ON public.submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments a 
            WHERE a.id = assignment_id AND public.is_class_teacher(a.class_id)
        )
    );

CREATE POLICY "Students can create submissions" ON public.submissions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND user_id = auth.uid() AND role = 'student')
    );

CREATE POLICY "Students can update own submissions" ON public.submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = student_id AND user_id = auth.uid())
    );

CREATE POLICY "Teachers can grade submissions" ON public.submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.assignments a 
            WHERE a.id = assignment_id AND public.is_class_teacher(a.class_id)
        )
    );

-- RLS Policies for materials
CREATE POLICY "Class participants can view materials" ON public.materials
    FOR SELECT USING (public.has_class_access(class_id));

CREATE POLICY "Teachers can manage materials" ON public.materials
    FOR ALL USING (public.is_class_teacher(class_id));

-- RLS Policies for class_schedule
CREATE POLICY "Class participants can view schedule" ON public.class_schedule
    FOR SELECT USING (public.has_class_access(class_id));

CREATE POLICY "Teachers can manage schedule" ON public.class_schedule
    FOR ALL USING (public.is_class_teacher(class_id));

-- RLS Policies for live_sessions
CREATE POLICY "Class participants can view sessions" ON public.live_sessions
    FOR SELECT USING (public.has_class_access(class_id));

CREATE POLICY "Teachers can manage sessions" ON public.live_sessions
    FOR ALL USING (public.is_class_teacher(class_id));

-- RLS Policies for session_participants
CREATE POLICY "Participants can view session attendance" ON public.session_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_sessions ls 
            WHERE ls.id = session_id AND public.has_class_access(ls.class_id)
        )
    );

CREATE POLICY "Users can join sessions" ON public.session_participants
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can update own participation" ON public.session_participants
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND user_id = auth.uid())
    );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to generate unique class code
CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM public.classes WHERE class_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();