"""Pydantic models for API request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class VideoSummaryResponse(BaseModel):
    """Response model for a single video summary."""
    id: UUID
    videoId: str = Field(alias="video_id")
    timestamp: str
    timestampSeconds: float = Field(alias="timestamp_seconds")
    description: str
    frameNumber: int = Field(alias="frame_number")
    createdAt: datetime = Field(alias="created_at")

    class Config:
        populate_by_name = True
        from_attributes = True


class VideoResponse(BaseModel):
    """Response model for a video."""
    id: UUID
    videoUrl: str = Field(alias="video_url")
    title: Optional[str] = None
    duration: str
    status: str
    keyTopics: Optional[str] = Field(None, alias="key_topics")
    frameInterval: int = Field(alias="frame_interval")
    totalFrames: int = Field(alias="total_frames")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    summaries: Optional[List[VideoSummaryResponse]] = None

    class Config:
        populate_by_name = True
        from_attributes = True


class VideoListResponse(BaseModel):
    """Response model for a list of videos."""
    videos: List[VideoResponse]
    total: int
    skip: int
    limit: int


class ProcessUrlRequest(BaseModel):
    """Request model for processing a video from URL."""
    url: str = Field(..., description="URL of the video to process")
    frameInterval: Optional[int] = Field(
        2, description="Seconds between frames", ge=1, le=60)
    title: Optional[str] = Field(
        None, description="Optional title for the video")


class VideoCreateRequest(BaseModel):
    """Request model for creating a video record."""
    videoUrl: str
    title: Optional[str] = None
    duration: str
    status: str = "processing"
    frameInterval: int = 2


class VideoSummaryCreateRequest(BaseModel):
    """Request model for creating a video summary."""
    videoId: UUID
    timestamp: str
    timestampSeconds: float
    description: str
    frameNumber: int
