# Overshoot.ai Video Streaming

A FastAPI backend with Streamlit frontend for streaming videos to Overshoot.ai and receiving real-time AI processing results.

## Features

- Upload video files or use webcam (webcam support coming soon)
- Real-time video streaming to Overshoot.ai via WebRTC
- Custom AI prompts (e.g., "Read any visible text", "Describe what you see")
- Live results display via WebSocket
- Dynamic prompt updates during streaming
- Multiple AI backend support (Gemini, OpenAI, Anthropic)

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Streamlit  │◄──WS───►│   FastAPI    │◄──WebRTC─►│ Overshoot.ai│
│  Frontend   │         │   Backend    │         │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Prerequisites

- Python 3.8 or higher
- Overshoot.ai API key (Get one from https://cluster1.overshoot.ai/api/v0.2/docs)
- FastAPI backend server
- Streamlit frontend

## Setup

### 1. Backend Setup

Navigate to the backend directory:

```bash
cd frame/backend
```

Create a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Overshoot.ai API key:

```env
OVERSHOOT_API_KEY=your_api_key_here
OVERSHOOT_API_URL=https://cluster1.overshoot.ai/api/v0.2
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
```

Start the FastAPI server:

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frame/frontend
```

Create a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the Streamlit app:

```bash
streamlit run app.py
```

The frontend will be available at `http://localhost:8501`

## Usage

1. **Start the Backend**: Make sure the FastAPI server is running on port 8000
2. **Start the Frontend**: Launch the Streamlit app
3. **Upload Video**: 
   - Select "File Upload" option
   - Choose a video file (mp4, avi, mov, mkv, webm)
   - Click "Upload Video"
4. **Configure AI Processing**:
   - Enter a custom prompt or select a preset
   - Choose AI backend (Gemini, OpenAI, Anthropic)
   - Adjust FPS if needed
5. **Start Streaming**: Click "Start Streaming" to begin processing
6. **View Results**: Results will appear in real-time in the "Real-time Results" section
7. **Update Prompt**: You can update the prompt during streaming by clicking "Update Prompt"
8. **Stop Streaming**: Click "Stop Streaming" when done

## API Endpoints

### Backend API

- `GET /` - Health check
- `POST /upload-video` - Upload a video file
- `POST /start-stream/{session_id}` - Start streaming to Overshoot.ai
- `WebSocket /ws/{session_id}` - Real-time results stream
- `POST /update-prompt/{session_id}` - Update inference prompt
- `POST /stop-stream/{session_id}` - Stop streaming and cleanup

### Example: Upload Video

```bash
curl -X POST "http://localhost:8000/upload-video" \
  -F "file=@video.mp4"
```

Response:
```json
{
  "session_id": "uuid-here",
  "filename": "video.mp4",
  "status": "uploaded",
  "file_size": 1234567
}
```

### Example: Start Stream

```bash
curl -X POST "http://localhost:8000/start-stream/{session_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Describe what you see in few words",
    "backend": "gemini",
    "fps": 1.0,
    "clip_length_seconds": 0.1,
    "delay_seconds": 1.0,
    "sampling_ratio": 0.1
  }'
```

## Configuration

### Backend Configuration

Edit `frame/backend/.env`:

- `OVERSHOOT_API_KEY`: Your Overshoot.ai API key (required)
- `OVERSHOOT_API_URL`: Overshoot.ai API base URL (default: https://cluster1.overshoot.ai/api/v0.2)
- `BACKEND_PORT`: FastAPI server port (default: 8000)
- `BACKEND_HOST`: FastAPI server host (default: 0.0.0.0)

### Frontend Configuration

Edit `frame/frontend/app.py`:

- `BACKEND_URL`: Backend API URL (default: http://localhost:8000)
- `WS_URL`: WebSocket URL (default: ws://localhost:8000)

Or configure via the Streamlit sidebar in the UI.

## Troubleshooting

### Backend Issues

**Error: "OVERSHOOT_API_KEY must be provided"**
- Make sure you've set the `OVERSHOOT_API_KEY` in your `.env` file
- Restart the backend server after updating `.env`

**Error: "Failed to connect to Overshoot.ai"**
- Check your internet connection
- Verify your API key is correct
- Check if Overshoot.ai service is available

**Error: "Timeout connecting to Overshoot.ai"**
- The API may be slow or overloaded
- Try again after a few seconds
- Check your network connection

### Frontend Issues

**Error: "Cannot connect to backend server"**
- Make sure the FastAPI backend is running
- Check that the backend URL in the frontend is correct
- Verify the backend is accessible (try `curl http://localhost:8000`)

**WebSocket connection fails**
- Ensure the backend is running
- Check that the session ID is valid
- Make sure the stream has been started before connecting WebSocket

**No results appearing**
- Verify the stream is active (check status indicators)
- Check backend logs for errors
- Ensure Overshoot.ai is processing the video

## Project Structure

```
frame/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── overshoot_client.py   # Overshoot.ai API client
│   ├── video_processor.py    # Video processing utilities
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables (create from .env.example)
├── frontend/
│   ├── app.py                # Streamlit application
│   └── requirements.txt       # Frontend dependencies
└── README.md                  # This file
```

## Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd frame/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend with auto-reload:
```bash
cd frame/frontend
streamlit run app.py --server.runOnSave true
```

### Testing

Test the backend health endpoint:
```bash
curl http://localhost:8000/
```

Test video upload:
```bash
curl -X POST "http://localhost:8000/upload-video" -F "file=@test.mp4"
```

## Limitations

- Maximum file size: 500MB
- Supported video formats: mp4, avi, mov, mkv, webm
- Webcam support is planned but not yet implemented
- Results are displayed in real-time but may have ~300ms latency from Overshoot.ai

## License

This project is provided as-is for use with Overshoot.ai API.

## Support

For issues related to:
- **This application**: Check the troubleshooting section above
- **Overshoot.ai API**: Visit https://cluster1.overshoot.ai/api/v0.2/docs
- **API Key**: Contact Overshoot.ai support
