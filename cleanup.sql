-- 1. Delete the broken accounts from auth
DELETE FROM auth.users WHERE email IN ('admin@ariseagency.com', 'master@ariseagency.in');

-- 2. Delete the broken accounts from public users (should cascade, but just to be safe)
DELETE FROM public.users WHERE email IN ('admin@ariseagency.com', 'master@ariseagency.in');
