uvicorn main:app --reload
# Frame Video Processing Backend

FastAPI backend for processing videos and extracting frame summaries using the SmolVLM-Instruct vision model.

## Features

- Upload and process video files
- Process videos from URLs
- Extract frame summaries at configurable intervals (default: 2 seconds)
- Store video metadata and summaries in Supabase
- RESTful API with camelCase responses matching frontend expectations

## Prerequisites

- Python 3.11+
- Supabase account and project
- HuggingFace account (for model access)

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key
- `MODEL_ID`: HuggingFace model ID (default: `HuggingFaceTB/SmolVLM-Instruct`)
- `UPLOAD_DIR`: Directory for temporary video files (default: `./uploads`)
- `MAX_VIDEO_SIZE`: Maximum video file size in MB (default: `500`)
- `FRAME_INTERVAL`: Seconds between frames (default: `2`)

### 3. Set Up Supabase Database

1. Open your Supabase project SQL editor
2. Run the SQL schema from `supabase_schema.sql`:

```sql
-- Copy and paste the contents of supabase_schema.sql
```

This will create:
- `videos` table for video metadata
- `video_summaries` table for frame summaries
- Indexes for optimal query performance
- Triggers for automatic timestamp updates

### 4. Authenticate with HuggingFace (if needed)

If the model requires authentication:

```bash
huggingface-cli login
```

## Running the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## API Endpoints

### POST `/videos/upload`

Upload and process a video file.

**Parameters:**
- `file`: Video file (multipart/form-data)
- `frame_interval`: Seconds between frames (query param, default: 2)
- `title`: Optional video title (query param)

**Response:**
```json
{
  "id": "uuid",
  "videoUrl": "string",
  "title": "string",
  "duration": "MM:SS",
  "status": "completed",
  "keyTopics": "string",
  "totalFrames": 10,
  "summaries": [...]
}
```

### POST `/videos/process-url`

Process a video from a URL.

**Request Body:**
```json
{
  "url": "https://example.com/video.mp4",
  "frameInterval": 2,
  "title": "Optional title"
}
```

**Response:** Same as `/videos/upload`

### GET `/videos`

List all videos with pagination.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 10, max: 100)

**Response:**
```json
{
  "videos": [...],
  "total": 50,
  "skip": 0,
  "limit": 10
}
```

### GET `/videos/{video_id}`

Get a single video with all its summaries.

**Response:**
```json
{
  "id": "uuid",
  "videoUrl": "string",
  "title": "string",
  "duration": "MM:SS",
  "status": "completed",
  "keyTopics": "string",
  "totalFrames": 10,
  "summaries": [...]
}
```

### GET `/videos/{video_id}/summaries`

Get summaries for a video with pagination.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100, max: 1000)

**Response:**
```json
{
  "summaries": [...],
  "total": 50,
  "skip": 0,
  "limit": 100
}
```

## Database Schema

### `videos` Table

- `id` (UUID, primary key)
- `video_url` (TEXT) - Original URL or file path
- `title` (TEXT, nullable) - Video title
- `duration` (TEXT) - Duration in "MM:SS" or "HH:MM:SS" format
- `status` (TEXT) - "processing", "completed", or "failed"
- `key_topics` (TEXT, nullable) - Aggregated key topics
- `frame_interval` (INTEGER) - Seconds between frames
- `total_frames` (INTEGER) - Number of frames processed
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `video_summaries` Table

- `id` (UUID, primary key)
- `video_id` (UUID, foreign key) - References `videos.id`
- `timestamp` (TEXT) - Human-readable timestamp (e.g., "0:02")
- `timestamp_seconds` (NUMERIC) - Timestamp in seconds
- `description` (TEXT) - Frame summary/description
- `frame_number` (INTEGER) - Frame index
- `created_at` (TIMESTAMPTZ)

## Supported Video Formats

- MP4
- AVI
- MOV
- MKV
- WEBM
- FLV
- WMV

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid file format, file too large, etc.)
- `404`: Resource not found
- `500`: Internal server error

Error responses include a `detail` field with the error message.

## Development

### Project Structure

```
backend/
├── main.py              # FastAPI application and routes
├── models.py            # Pydantic models for request/response
├── video_processor.py   # Video processing logic
├── supabase_client.py   # Supabase database operations
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
├── .env.example         # Example environment variables
├── supabase_schema.sql  # Database schema
└── README.md           # This file
```

### Logging

The application uses Python's logging module. Logs include:
- Application startup
- Video processing progress
- Database operations
- Errors and exceptions

## Notes

- Videos are processed synchronously (the API waits for processing to complete)
- Temporary video files are automatically cleaned up after processing
- The model is loaded once on first use and reused for subsequent requests
- API responses use camelCase to match frontend expectations (e.g., `videoUrl`, `keyTopics`)

## Troubleshooting

### Model Loading Issues

If you encounter model loading errors:
1. Ensure you're authenticated with HuggingFace: `huggingface-cli login`
2. Check that you have sufficient disk space for the model
3. Verify your internet connection for model download

### Supabase Connection Issues

1. Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
2. Ensure the database schema has been created
3. Check Supabase project status and API access

### Video Processing Errors

1. Verify the video file is in a supported format
2. Check that the file size is within limits
3. Ensure sufficient disk space for temporary files
4. Check logs for detailed error messages
