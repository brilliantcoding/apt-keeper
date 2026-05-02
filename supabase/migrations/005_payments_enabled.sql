-- Add payments_enabled toggle to properties
-- Allows admins to enable/disable online payments per property
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT true;
