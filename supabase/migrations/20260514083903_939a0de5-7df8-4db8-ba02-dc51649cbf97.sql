CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.chatbot_training_examples
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_source text;

ALTER TABLE public.admin_chatbot_training_examples
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_source text;

CREATE INDEX IF NOT EXISTS idx_chatbot_training_examples_embedding
  ON public.chatbot_training_examples
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_admin_chatbot_training_examples_embedding
  ON public.admin_chatbot_training_examples
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE OR REPLACE FUNCTION public.invalidate_training_embedding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.question IS DISTINCT FROM OLD.question
     OR NEW.ideal_answer IS DISTINCT FROM OLD.ideal_answer THEN
    NEW.embedding := NULL;
    NEW.embedding_source := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_chatbot_training_embedding ON public.chatbot_training_examples;
CREATE TRIGGER trg_invalidate_chatbot_training_embedding
  BEFORE UPDATE ON public.chatbot_training_examples
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_training_embedding();

DROP TRIGGER IF EXISTS trg_invalidate_admin_training_embedding ON public.admin_chatbot_training_examples;
CREATE TRIGGER trg_invalidate_admin_training_embedding
  BEFORE UPDATE ON public.admin_chatbot_training_examples
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_training_embedding();

CREATE OR REPLACE FUNCTION public.match_training_examples(
  query_embedding vector(1536),
  match_count int DEFAULT 6,
  min_similarity float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  question text,
  ideal_answer text,
  category text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.question,
    t.ideal_answer,
    t.category,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.chatbot_training_examples t
  WHERE t.is_active = true
    AND t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) >= min_similarity
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_admin_training_examples(
  query_embedding vector(1536),
  match_count int DEFAULT 8,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  question text,
  ideal_answer text,
  category text,
  source text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT
      t.id,
      t.question,
      t.ideal_answer,
      t.category,
      'admin'::text AS source,
      1 - (t.embedding <=> query_embedding) AS similarity
    FROM public.admin_chatbot_training_examples t
    WHERE t.is_active = true
      AND t.embedding IS NOT NULL
      AND 1 - (t.embedding <=> query_embedding) >= min_similarity
  )
  UNION ALL
  (
    SELECT
      t.id,
      t.question,
      t.ideal_answer,
      t.category,
      'guest'::text AS source,
      1 - (t.embedding <=> query_embedding) AS similarity
    FROM public.chatbot_training_examples t
    WHERE t.is_active = true
      AND t.embedding IS NOT NULL
      AND 1 - (t.embedding <=> query_embedding) >= min_similarity
  )
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_training_examples(vector, int, float) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_admin_training_examples(vector, int, float) TO authenticated, service_role;