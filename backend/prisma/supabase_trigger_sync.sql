-- =============================================================
-- Supabase Trigger: Auto-sync Auth Users to Public Users Table
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query
-- =============================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, password_hash, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    '', -- OAuth users don't have a local password hash
    'user'
  )
  -- If the user somehow already exists, just update their name
  ON CONFLICT (email) DO UPDATE 
  SET name = EXCLUDED.name,
      id = EXCLUDED.id;
      
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
-- Drop it first if it exists to prevent duplication errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================
-- Verify: Manually sync any users that missed the trigger earlier
-- =============================================================
INSERT INTO public.users (id, name, email, password_hash, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)), 
  email, 
  '', 
  'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE public.users.id = auth.users.id
)
ON CONFLICT (email) DO NOTHING;
