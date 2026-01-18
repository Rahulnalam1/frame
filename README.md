# Frame

**Turn any video content into an API**

Frame is a full-stack platform that extracts structured data from videos using AI vision models. Send us a video URL, get back JSON with transcripts, products, topics, and key moments. Think Stripe for video intelligence.

## Overview

Frame consists of two main components:

- **Backend** (`backend/`): FastAPI service that processes videos using SmolVLM-Instruct vision model, extracts frame summaries, and stores data in Supabase
- **Frontend** (`frame-web/`): Next.js web application with interactive dashboard for video analysis and content gap analysis

## Features

### Video Processing
- Upload videos via file upload or URL
- YouTube video integration via Apify
- Extract frame summaries at configurable intervals (default: 2-5 seconds)
- Process videos using GPU-powered Modal functions
- Store video metadata and summaries in Supabase
- Support for multiple video formats (MP4, AVI, MOV, MKV, WEBM, FLV, WMV)

### API Access
- RESTful API with camelCase responses
- API key authentication for secure access
- Pagination support for large datasets
- Real-time processing status updates

### Content Analysis
- Automatic key topic extraction
- Content gap analysis dashboard
- Video clustering and pattern recognition
- AI-powered recommendations for content strategy

### Web Interface
- Interactive video table with drag-and-drop resizing
- Real-time video processing queue
- Content gap analysis visualization
- API key management
- Responsive, modern UI built with Tailwind CSS and Framer Motion

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SmolVLM-Instruct** - Vision-language model for frame analysis
- **Supabase** - PostgreSQL database and backend services
- **Modal** - GPU-accelerated video processing
- **Google Cloud Storage** - Video storage and hosting
- **Apify** - YouTube video downloading
- **OpenCV** - Video manipulation and frame extraction

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Recharts** - Data visualization
- **Radix UI** - Accessible component primitives

## Project Structure

```
frame/
├── backend/                 # FastAPI backend service
│   ├── main.py             # FastAPI application and routes
│   ├── models.py           # Pydantic models for request/response
│   ├── video_processor.py  # Video processing logic
│   ├── video_utils.py      # Video utility functions
│   ├── supabase_client.py  # Supabase database operations
│   ├── config.py           # Configuration management
│   ├── gcp_uploader.py     # Google Cloud Storage integration
│   ├── youtube_uploader.py # YouTube video downloading via Apify
│   ├── requirements.txt    # Python dependencies
│   ├── supabase_schema.sql # Database schema
│   └── uploads/            # Temporary video storage
│
├── frame-web/              # Next.js frontend application
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx       # Main landing page with video table
│   │   ├── dashboard/     # Content gap analysis dashboard
│   │   ├── docs/          # API documentation page
│   │   └── waitlist/       # Waitlist page
│   ├── components/        # React components
│   │   └── ui/            # Reusable UI components
│   ├── lib/               # Utility functions and API client
│   └── public/            # Static assets
│
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Supabase account and project
- Google Cloud Platform account with Storage bucket
- HuggingFace account (for model access)
- Apify account (for YouTube downloads)
- Modal account (for GPU processing)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_service_role_key

   # Model Configuration
   MODEL_ID=HuggingFaceTB/SmolVLM-Instruct

   # Upload Configuration
   UPLOAD_DIR=./uploads
   MAX_VIDEO_SIZE=500

   # Frame Processing
   FRAME_INTERVAL=5

   # Apify Configuration (for YouTube downloads)
   APIFY_API_KEY=your_apify_api_key
   APIFY_ACTOR_ID=UUhJDfKJT2SsXdclR

   # Google Cloud Storage Configuration
   GCP_BUCKET_NAME=your_gcp_bucket_name
   GCP_SERVICE_KEY_PATH=./service-key.json
   ```

4. **Set up Supabase database:**
   
   Run the SQL schema from `supabase_schema.sql` in your Supabase SQL editor to create the necessary tables:
   - `videos` - Video metadata
   - `video_summaries` - Frame summaries
   - `api_keys` - API key management

5. **Authenticate with HuggingFace (if needed):**
   ```bash
   huggingface-cli login
   ```

6. **Set up Google Cloud Storage:**
   - Create a GCS bucket
   - Download service account key JSON file
   - Place it at `backend/service-key.json`

7. **Deploy Modal function:**
   
   The backend requires a Modal function for GPU-accelerated video processing. Ensure you have deployed the `video-frame-processor` Modal function with the `process_video_on_gpu` endpoint.

8. **Run the backend server:**
   ```bash
   uvicorn main:app --reload
   ```
   
   The API will be available at `http://localhost:8000`
   - API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frame-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env.local` file in the `frame-web/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

## API Endpoints

### Video Processing

#### `POST /videos/upload`
Upload and process a video file.

**Parameters:**
- `file`: Video file (multipart/form-data)
- `frame_interval`: Seconds between frames (query param, default: 2)
- `title`: Optional video title (query param)

#### `POST /videos/process-url`
Process a video from a URL (supports GCP URLs and regular URLs).

**Request Body:**
```json
{
  "url": "https://example.com/video.mp4",
  "frameInterval": 5,
  "title": "Optional title"
}
```

#### `POST /videos/youtube-upload`
Upload a YouTube video to Google Cloud Storage using Apify.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "preferredQuality": "480p",
  "preferredFormat": "mp4",
  "title": "Optional title"
}
```

### Video Retrieval

#### `GET /videos`
List all videos with pagination.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 10, max: 100)

#### `GET /videos/{video_id}`
Get a single video with all its summaries.

#### `GET /videos/{video_id}/summaries`
Get summaries for a video with pagination.

### API Key Management

#### `POST /api-keys/generate`
Generate a new API key for accessing video data.

#### `GET /api/videos` (requires API key)
List all videos (requires `X-API-Key` header).

#### `GET /api/videos/{video_id}` (requires API key)
Get a single video (requires `X-API-Key` header).

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

### `api_keys` Table
- `id` (UUID, primary key)
- `api_key` (TEXT, unique) - Generated API key
- `created_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ, nullable)

## Usage Examples

### Process a YouTube Video

1. **Upload YouTube video to GCP:**
   ```bash
   curl -X POST http://localhost:8000/videos/youtube-upload \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://www.youtube.com/watch?v=VIDEO_ID",
       "title": "My Video Title"
     }'
   ```

2. **Process the video:**
   ```bash
   curl -X POST http://localhost:8000/videos/process-url \
     -H "Content-Type: application/json" \
     -d '{
       "url": "gs://bucket/path/to/video.mp4",
       "frameInterval": 5,
       "title": "My Video Title"
     }'
   ```

### Retrieve Video Data via API

```bash
# Generate API key
curl -X POST http://localhost:8000/api-keys/generate

# List videos (replace YOUR_API_KEY)
curl -X GET http://localhost:8000/api/videos \
  -H "X-API-Key: YOUR_API_KEY"

# Get specific video
curl -X GET http://localhost:8000/api/videos/VIDEO_ID \
  -H "X-API-Key: YOUR_API_KEY"
```

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation at `/docs`. Key modules:

- `main.py` - API routes and request handling
- `video_processor.py` - Video processing orchestration
- `supabase_client.py` - Database operations
- `config.py` - Environment-based configuration

### Frontend Development

The frontend uses Next.js 16 with the App Router. Key features:

- Server-side rendering and static generation
- Client-side interactivity with React hooks
- Real-time updates via API polling
- Responsive design with Tailwind CSS

### Running Tests

```bash
# Backend tests (if available)
cd backend
pytest

# Frontend tests (if available)
cd frame-web
npm test
```

## Deployment

### Backend Deployment

The backend can be deployed to:
- **Modal** - For GPU-accelerated processing
- **Railway** - For API hosting
- **Google Cloud Run** - Containerized deployment
- **AWS Lambda** - Serverless deployment

### Frontend Deployment

The frontend can be deployed to:
- **Vercel** - Recommended for Next.js (easiest)
- **Netlify** - Alternative hosting
- **AWS Amplify** - AWS integration

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

**Backend:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GCP_BUCKET_NAME`
- `GCP_SERVICE_KEY_PATH` (or use secret management)
- `APIFY_API_KEY`
- `MODEL_ID`

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Your deployed backend URL

## Troubleshooting

### Model Loading Issues
- Ensure you're authenticated with HuggingFace: `huggingface-cli login`
- Check that you have sufficient disk space for the model
- Verify your internet connection for model download

### Supabase Connection Issues
- Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Ensure the database schema has been created
- Check Supabase project status and API access

### Video Processing Errors
- Verify the video file is in a supported format
- Check that the file size is within limits
- Ensure sufficient disk space for temporary files
- Verify Modal function is deployed and accessible

### GCP Upload Issues
- Verify service account key has proper permissions
- Check bucket name and path are correct
- Ensure bucket exists and is accessible

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Frame** - Extract structured data from any video in 90 seconds. Stripe for video intelligence.
