-- Create a function to check manager role (for use in RLS if needed)
-- Using text comparison instead of enum to avoid enum value issues
CREATE OR REPLACE FUNCTION public.get_manager_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 1 
      WHEN 'admin' THEN 2
      WHEN 'booking_manager' THEN 3 
      WHEN 'viewer' THEN 4 
      ELSE 5 
    END
  LIMIT 1
$$;