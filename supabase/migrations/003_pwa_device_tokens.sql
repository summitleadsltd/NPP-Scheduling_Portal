-- Add platform and updated_at columns to device_tokens
ALTER TABLE ss_device_tokens ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios'));
ALTER TABLE ss_device_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint on user_id + token to prevent duplicate registrations
ALTER TABLE ss_device_tokens DROP CONSTRAINT IF EXISTS ss_device_tokens_user_token_unique;
ALTER TABLE ss_device_tokens ADD CONSTRAINT ss_device_tokens_user_token_unique UNIQUE (user_id, token);
