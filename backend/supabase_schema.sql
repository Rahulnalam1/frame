-- Supabase schema for Frame Video Processing API
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_url TEXT NOT NULL,
    title TEXT,
    duration TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    key_topics TEXT,
    frame_interval INTEGER NOT NULL DEFAULT 2,
    total_frames INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create video_summaries table
CREATE TABLE IF NOT EXISTS video_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    timestamp_seconds NUMERIC NOT NULL,
    description TEXT NOT NULL,
    frame_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_summaries_video_id ON video_summaries(video_id);
CREATE INDEX IF NOT EXISTS idx_video_summaries_timestamp_seconds ON video_summaries(timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create index for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE videos IS 'Stores video metadata and processing status';
COMMENT ON TABLE video_summaries IS 'Stores frame-by-frame summaries for each video';
COMMENT ON TABLE api_keys IS 'Stores API keys for accessing video data';
COMMENT ON COLUMN videos.video_url IS 'Original URL or file path of the video';
COMMENT ON COLUMN videos.status IS 'Processing status: processing, completed, or failed';
COMMENT ON COLUMN videos.frame_interval IS 'Seconds between extracted frames';
COMMENT ON COLUMN video_summaries.timestamp IS 'Human-readable timestamp (e.g., "0:02", "1:30")';
COMMENT ON COLUMN video_summaries.timestamp_seconds IS 'Timestamp in seconds for sorting and calculations';
COMMENT ON COLUMN api_keys.api_key IS 'Unique API key for authentication';