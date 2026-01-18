"""Supabase client for database operations."""
from supabase import create_client, Client
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from config import settings

logger = logging.getLogger(__name__)

# Global Supabase client
_supabase: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client (singleton pattern)."""
    global _supabase

    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized")

    return _supabase


def create_video(video_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new video record in the database.

    Args:
        video_data: Dictionary with video fields (video_url, title, duration, status, etc.)

    Returns:
        Created video record
    """
    client = get_supabase_client()

    try:
        response = client.table("videos").insert(video_data).execute()
        if response.data:
            logger.info("Created video record: %s", response.data[0].get('id'))
            return response.data[0]
        else:
            raise ValueError("No data returned from insert")
    except Exception as e:
        logger.error(f"Error creating video: {e}")
        raise


def get_video(video_id: UUID) -> Optional[Dict[str, Any]]:
    """
    Get a video by ID.

    Args:
        video_id: UUID of the video

    Returns:
        Video record or None if not found
    """
    client = get_supabase_client()

    try:
        response = client.table("videos").select(
            "*").eq("id", str(video_id)).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting video {video_id}: {e}")
        raise


def update_video(video_id: UUID, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a video record.

    Args:
        video_id: UUID of the video
        updates: Dictionary with fields to update

    Returns:
        Updated video record
    """
    client = get_supabase_client()

    try:
        # Add updated_at timestamp
        updates["updated_at"] = "now()"

        response = client.table("videos").update(
            updates).eq("id", str(video_id)).execute()
        if response.data:
            logger.info("Updated video record: %s", video_id)
            return response.data[0]
        else:
            raise ValueError("No data returned from update")
    except Exception as e:
        logger.error(f"Error updating video {video_id}: {e}")
        raise


def list_videos(skip: int = 0, limit: int = 10) -> tuple[List[Dict[str, Any]], int]:
    """
    List videos with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (list of videos, total count)
    """
    client = get_supabase_client()

    try:
        # Get total count
        count_response = client.table("videos").select(
            "id", count="exact").execute()
        total = count_response.count if count_response.count is not None else 0

        # Get paginated results
        response = (
            client.table("videos")
            .select("*")
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )

        return response.data, total
    except Exception as e:
        logger.error(f"Error listing videos: {e}")
        raise


def create_video_summaries(summaries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Create multiple video summary records.

    Args:
        summaries: List of summary dictionaries with video_id, timestamp, description, etc.

    Returns:
        List of created summary records
    """
    client = get_supabase_client()

    try:
        response = client.table("video_summaries").insert(summaries).execute()
        if response.data:
            logger.info("Created %d video summary records", len(response.data))
            return response.data
        else:
            raise ValueError("No data returned from insert")
    except Exception as e:
        logger.error(f"Error creating video summaries: {e}")
        raise


def get_video_summaries(
    video_id: UUID,
    skip: int = 0,
    limit: int = 100
) -> tuple[List[Dict[str, Any]], int]:
    """
    Get summaries for a video with pagination.

    Args:
        video_id: UUID of the video
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (list of summaries, total count)
    """
    client = get_supabase_client()

    try:
        # Get total count
        count_response = (
            client.table("video_summaries")
            .select("id", count="exact")
            .eq("video_id", str(video_id))
            .execute()
        )
        total = count_response.count if count_response.count is not None else 0

        # Get paginated results
        response = (
            client.table("video_summaries")
            .select("*")
            .eq("video_id", str(video_id))
            .order("timestamp_seconds", desc=False)
            .range(skip, skip + limit - 1)
            .execute()
        )

        return response.data, total
    except Exception as e:
        logger.error(f"Error getting video summaries for {video_id}: {e}")
        raise


def get_video_with_summaries(video_id: UUID) -> Optional[Dict[str, Any]]:
    """
    Get a video with all its summaries.

    Args:
        video_id: UUID of the video

    Returns:
        Video record with summaries list, or None if not found
    """
    video = get_video(video_id)
    if not video:
        return None

    summaries, _ = get_video_summaries(video_id, skip=0, limit=1000)
    video["summaries"] = summaries

    return video


def aggregate_key_topics(summaries: List[Dict[str, Any]]) -> str:
    """
    Aggregate key topics from video summaries.
    Creates a brief summary of the main topics covered in the video.

    Args:
        summaries: List of summary dictionaries

    Returns:
        Aggregated key topics string
    """
    if not summaries:
        return ""

    # Take first few summaries and combine them
    # In a more sophisticated implementation, this could use NLP to extract key topics
    descriptions = [s.get("description", "") for s in summaries[:5]]
    combined = " ".join(descriptions)

    # Truncate to reasonable length
    if len(combined) > 500:
        combined = combined[:500] + "..."

    return combined


def create_api_key() -> Dict[str, Any]:
    """
    Create a new API key in the database.

    Returns:
        Created API key record with the generated key
    """
    import secrets

    client = get_supabase_client()

    try:
        # Generate a secure random API key
        api_key = f"frame_{secrets.token_urlsafe(32)}"

        api_key_data = {
            "api_key": api_key
        }

        response = client.table("api_keys").insert(api_key_data).execute()
        if response.data:
            logger.info("Created API key: %s", response.data[0].get('id'))
            return response.data[0]
        else:
            raise ValueError("No data returned from insert")
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise


def validate_api_key(api_key: str) -> bool:
    """
    Validate an API key exists and is not expired.

    Args:
        api_key: The API key to validate

    Returns:
        True if valid, False otherwise
    """
    client = get_supabase_client()

    try:
        from datetime import datetime, timezone

        response = (
            client.table("api_keys")
            .select("*")
            .eq("api_key", api_key)
            .execute()
        )

        if not response.data or len(response.data) == 0:
            return False

        key_record = response.data[0]

        # Check if expired
        if key_record.get("expires_at"):
            expires_at_str = key_record["expires_at"]
            try:
                # Handle ISO format with or without timezone
                if expires_at_str.endswith("Z"):
                    expires_at = datetime.fromisoformat(
                        expires_at_str.replace("Z", "+00:00"))
                else:
                    expires_at = datetime.fromisoformat(expires_at_str)

                # Get current time in same timezone as expires_at
                if expires_at.tzinfo:
                    now = datetime.now(timezone.utc)
                else:
                    now = datetime.now()

                if now > expires_at:
                    return False
            except (ValueError, AttributeError) as e:
                logger.warning(f"Error parsing expires_at for API key: {e}")
                # If we can't parse the date, assume it's valid (don't block access)

        return True
    except Exception as e:
        logger.error(f"Error validating API key: {e}")
        return False


def get_api_key_by_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Get an API key record by the API key string.

    Args:
        api_key: The API key string

    Returns:
        API key record or None if not found
    """
    client = get_supabase_client()

    try:
        response = (
            client.table("api_keys")
            .select("*")
            .eq("api_key", api_key)
            .execute()
        )

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting API key: {e}")
        return None
