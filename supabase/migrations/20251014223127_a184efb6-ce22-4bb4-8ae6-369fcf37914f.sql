-- Fix security warnings from previous migration
-- Set search_path for jsonb_merge function to prevent search path manipulation

DROP FUNCTION IF EXISTS jsonb_merge(jsonb, jsonb);

CREATE OR REPLACE FUNCTION jsonb_merge(a jsonb, b jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN a || b;
END;
$$;