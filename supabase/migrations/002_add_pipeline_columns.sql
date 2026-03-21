ALTER TABLE content_pieces ADD COLUMN IF NOT EXISTS post_time TIMESTAMPTZ;
ALTER TABLE content_pieces ADD COLUMN IF NOT EXISTS content_subtype TEXT;
ALTER TABLE content_pieces ADD COLUMN IF NOT EXISTS image_style TEXT;

-- Allow single_image as a valid content type
ALTER TABLE content_pieces DROP CONSTRAINT IF EXISTS content_pieces_type_check;
ALTER TABLE content_pieces ADD CONSTRAINT content_pieces_type_check CHECK (type IN ('reel', 'carousel', 'single_image'));
