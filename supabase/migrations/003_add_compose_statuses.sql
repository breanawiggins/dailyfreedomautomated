ALTER TABLE content_pieces DROP CONSTRAINT IF EXISTS content_pieces_status_check;
ALTER TABLE content_pieces ADD CONSTRAINT content_pieces_status_check CHECK (status IN ('draft', 'asset_ready', 'composed', 'approved', 'rejected', 'scheduled'));
