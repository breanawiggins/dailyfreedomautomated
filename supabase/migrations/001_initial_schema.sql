-- DailyFreedomAutomated - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content Batches table
CREATE TABLE content_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  week_of DATE NOT NULL,
  niche TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'partial')),
  total_pieces INT NOT NULL DEFAULT 0
);

-- Content Pieces table
CREATE TABLE content_pieces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES content_batches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('reel', 'carousel')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'scheduled')),
  hook TEXT,
  copy JSONB,
  image_urls JSONB DEFAULT '[]'::jsonb,
  composed_urls JSONB DEFAULT '[]'::jsonb,
  buffer_post_id TEXT,
  scheduled_time TIMESTAMPTZ,
  notes TEXT
);

-- Niche Settings table
CREATE TABLE niche_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  niche_topic TEXT NOT NULL,
  tone TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  content_pillars JSONB DEFAULT '[]'::jsonb,
  cta_keyword TEXT,
  instagram_handle TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for common queries
CREATE INDEX idx_content_pieces_batch_id ON content_pieces(batch_id);
CREATE INDEX idx_content_pieces_status ON content_pieces(status);
CREATE INDEX idx_content_batches_status ON content_batches(status);
CREATE INDEX idx_niche_settings_is_active ON niche_settings(is_active);
