-- Create table for training examples (Q&A pairs)
CREATE TABLE public.chatbot_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  ideal_answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for message ratings/feedback
CREATE TABLE public.chat_message_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_good_example BOOLEAN DEFAULT false,
  admin_notes TEXT,
  rated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id)
);

-- Enable RLS
ALTER TABLE public.chatbot_training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_ratings ENABLE ROW LEVEL SECURITY;

-- RLS for chatbot_training_examples
CREATE POLICY "Anyone can read active training examples"
ON public.chatbot_training_examples
FOR SELECT
USING ((is_active = true) OR is_admin());

CREATE POLICY "Admins can insert training examples"
ON public.chatbot_training_examples
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update training examples"
ON public.chatbot_training_examples
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete training examples"
ON public.chatbot_training_examples
FOR DELETE
USING (is_admin());

-- RLS for chat_message_ratings
CREATE POLICY "Admins can view all ratings"
ON public.chat_message_ratings
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert ratings"
ON public.chat_message_ratings
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update ratings"
ON public.chat_message_ratings
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete ratings"
ON public.chat_message_ratings
FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_chatbot_training_examples_updated_at
BEFORE UPDATE ON public.chatbot_training_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();