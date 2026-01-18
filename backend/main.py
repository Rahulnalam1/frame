"""FastAPI application for video processing."""
import os
import logging
import tempfile
from pathlib import Path
from typing import Optional
from uuid import UUID
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import httpx

from config import settings
from models import (
    VideoResponse,
    VideoListResponse,
    VideoSummaryResponse,
    ProcessUrlRequest,
)
from video_processor import process_video, get_video_duration, format_timestamp
from supabase_client import (
    create_video,
    get_video,
    get_video_with_summaries,
    update_video,
    list_videos,
    create_video_summaries,
    get_video_summaries,
    aggregate_key_topics,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Frame Video Processing API",
    description="API for processing videos and extracting frame summaries",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    logger.info("Starting FastAPI application")
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")
    logger.info(f"Model ID: {settings.MODEL_ID}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Frame Video Processing API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


def validate_video_file(filename: str) -> bool:
    """Validate that the uploaded file is a supported video format."""
    ext = Path(filename).suffix.lower()
    return ext in settings.ALLOWED_VIDEO_EXTENSIONS


async def download_video_from_url(url: str, output_path: Path) -> Path:
    """Download a video from a URL."""
    logger.info(f"Downloading video from URL: {url}")
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream("GET", url) as response:
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download video from URL: {response.status_code}"
                )
            
            with open(output_path, "wb") as f:
                async for chunk in response.aiter_bytes():
                    f.write(chunk)
    
    logger.info(f"Downloaded video to: {output_path}")
    return output_path


@app.post("/videos/upload", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    frame_interval: int = Query(2, ge=1, le=60, description="Seconds between frames"),
    title: Optional[str] = Query(None, description="Optional title for the video"),
):
    """
    Upload and process a video file.
    
    - **file**: Video file to upload (mp4, avi, mov, etc.)
    - **frame_interval**: Seconds between frames to extract (default: 2)
    - **title**: Optional title for the video
    """
    # Validate file
    if not validate_video_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format. Allowed: {', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}"
        )
    
    # Save uploaded file
    file_ext = Path(file.filename).suffix
    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=file_ext,
        dir=settings.UPLOAD_DIR
    )
    
    try:
        # Read and save file
        content = await file.read()
        if len(content) > settings.MAX_VIDEO_SIZE * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.MAX_VIDEO_SIZE}MB"
            )
        
        temp_file.write(content)
        temp_file.close()
        
        video_path = Path(temp_file.name)
        
        # Get video duration
        duration_seconds = get_video_duration(str(video_path))
        duration_formatted = format_timestamp(duration_seconds)
        
        # Create video record with "processing" status
        video_data = {
            "video_url": file.filename or "uploaded_video",
            "title": title,
            "duration": duration_formatted,
            "status": "processing",
            "frame_interval": frame_interval,
            "total_frames": 0,
        }
        
        video_record = create_video(video_data)
        video_id = video_record["id"]
        
        try:
            # Process video
            summaries = process_video(str(video_path), interval=frame_interval)
            
            # Create summary records
            summary_records = []
            for summary in summaries:
                summary_records.append({
                    "video_id": video_id,
                    "timestamp": summary["timestamp"],
                    "timestamp_seconds": summary["timestamp_seconds"],
                    "description": summary["description"],
                    "frame_number": summary["frame_number"],
                })
            
            if summary_records:
                create_video_summaries(summary_records)
            
            # Aggregate key topics
            key_topics = aggregate_key_topics(summaries)
            
            # Update video record with completed status
            update_video(
                video_id,
                {
                    "status": "completed",
                    "total_frames": len(summaries),
                    "key_topics": key_topics,
                }
            )
            
            # Get updated video with summaries
            video = get_video_with_summaries(UUID(video_id))
            
            if not video:
                raise HTTPException(status_code=404, detail="Video not found after processing")
            
            # Convert to response model (handles camelCase conversion)
            return VideoResponse(**video)
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            # Update status to failed
            update_video(video_id, {"status": "failed"})
            raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")
        
        finally:
            # Clean up temporary file
            try:
                if video_path.exists():
                    video_path.unlink()
            except Exception as e:
                logger.warning(f"Error deleting temporary file: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading video: {str(e)}")


@app.post("/videos/process-url", response_model=VideoResponse)
async def process_video_url(request: ProcessUrlRequest):
    """
    Process a video from a URL.
    
    - **url**: URL of the video to process
    - **frame_interval**: Seconds between frames (default: 2)
    - **title**: Optional title for the video
    """
    url = request.url
    frame_interval = request.frameInterval or settings.DEFAULT_FRAME_INTERVAL
    title = request.title
    
    # Download video to temporary file
    file_ext = ".mp4"  # Default extension
    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=file_ext,
        dir=settings.UPLOAD_DIR
    )
    temp_file.close()
    
    video_path = Path(temp_file.name)
    
    try:
        # Download video
        await download_video_from_url(url, video_path)
        
        # Get video duration
        duration_seconds = get_video_duration(str(video_path))
        duration_formatted = format_timestamp(duration_seconds)
        
        # Create video record with "processing" status
        video_data = {
            "video_url": url,
            "title": title,
            "duration": duration_formatted,
            "status": "processing",
            "frame_interval": frame_interval,
            "total_frames": 0,
        }
        
        video_record = create_video(video_data)
        video_id = video_record["id"]
        
        try:
            # Process video
            summaries = process_video(str(video_path), interval=frame_interval)
            
            # Create summary records
            summary_records = []
            for summary in summaries:
                summary_records.append({
                    "video_id": video_id,
                    "timestamp": summary["timestamp"],
                    "timestamp_seconds": summary["timestamp_seconds"],
                    "description": summary["description"],
                    "frame_number": summary["frame_number"],
                })
            
            if summary_records:
                create_video_summaries(summary_records)
            
            # Aggregate key topics
            key_topics = aggregate_key_topics(summaries)
            
            # Update video record with completed status
            update_video(
                video_id,
                {
                    "status": "completed",
                    "total_frames": len(summaries),
                    "key_topics": key_topics,
                }
            )
            
            # Get updated video with summaries
            video = get_video_with_summaries(UUID(video_id))
            
            if not video:
                raise HTTPException(status_code=404, detail="Video not found after processing")
            
            # Convert to response model (handles camelCase conversion)
            return VideoResponse(**video)
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            # Update status to failed
            update_video(video_id, {"status": "failed"})
            raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")
        
        finally:
            # Clean up temporary file
            try:
                if video_path.exists():
                    video_path.unlink()
            except Exception as e:
                logger.warning(f"Error deleting temporary file: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing video URL: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing video URL: {str(e)}")


@app.get("/videos", response_model=VideoListResponse)
async def list_all_videos(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of records to return"),
):
    """
    List all videos with pagination.
    
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 10, max: 100)
    """
    try:
        videos_data, total = list_videos(skip=skip, limit=limit)
        
        # Convert to response models
        videos = [VideoResponse(**video) for video in videos_data]
        
        return VideoListResponse(
            videos=videos,
            total=total,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"Error listing videos: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing videos: {str(e)}")


@app.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video_by_id(video_id: UUID):
    """
    Get a single video by ID with all its summaries.
    
    - **video_id**: UUID of the video
    """
    try:
        video = get_video_with_summaries(video_id)
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return VideoResponse(**video)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting video: {str(e)}")


@app.get("/videos/{video_id}/summaries")
async def get_video_summaries_endpoint(
    video_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
):
    """
    Get summaries for a video with pagination.
    
    - **video_id**: UUID of the video
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100, max: 1000)
    """
    try:
        # Verify video exists
        video = get_video(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        summaries_data, total = get_video_summaries(video_id, skip=skip, limit=limit)
        
        # Convert to response models
        summaries = [VideoSummaryResponse(**summary) for summary in summaries_data]
        
        return {
            "summaries": summaries,
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video summaries for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting video summaries: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
