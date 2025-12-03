-- Update RLS policies to allow public INSERT for chat logging
-- Drop existing policies if they exist and recreate

-- For chat_conversations
DROP POLICY IF EXISTS "Anyone can insert conversations" ON chat_conversations;
CREATE POLICY "Anyone can insert conversations"
ON chat_conversations FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their conversations" ON chat_conversations;
CREATE POLICY "Anyone can update their conversations"
ON chat_conversations FOR UPDATE
USING (true)
WITH CHECK (true);

-- For chat_messages  
DROP POLICY IF EXISTS "Anyone can insert messages" ON chat_messages;
CREATE POLICY "Anyone can insert messages"
ON chat_messages FOR INSERT
WITH CHECK (true);

-- Admin can delete conversations
DROP POLICY IF EXISTS "Admins can delete conversations" ON chat_conversations;
CREATE POLICY "Admins can delete conversations"
ON chat_conversations FOR DELETE
USING (is_admin());

-- Admin can delete messages
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_messages;
CREATE POLICY "Admins can delete messages"
ON chat_messages FOR DELETE
USING (is_admin());