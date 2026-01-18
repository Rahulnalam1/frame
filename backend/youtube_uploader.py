"""YouTube video uploader using Apify and Google Cloud Storage."""
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from apify_client import ApifyClient

from config import settings

logger = logging.getLogger(__name__)


def load_gcp_service_key() -> Dict[str, Any]:
    """
    Load Google Cloud service account key from JSON file.
    
    Returns:
        Service key dictionary
    
    Raises:
        FileNotFoundError: If service key file doesn't exist
        ValueError: If service key file is invalid
    """
    service_key_path = settings.GCP_SERVICE_KEY_PATH
    
    if not service_key_path.exists():
        raise FileNotFoundError(
            f"GCP service key file not found: {service_key_path}. "
            f"Set GCP_SERVICE_KEY_PATH environment variable or place service-key.json in backend folder."
        )
    
    try:
        with open(service_key_path, 'r') as f:
            service_key = json.load(f)
        logger.info("Loaded GCP service key from: %s", service_key_path)
        return service_key
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in service key file: {e}")
    except Exception as e:
        raise ValueError(f"Error reading service key file: {e}")


def upload_youtube_to_gcp(
    youtube_url: str,
    preferred_quality: str = "480p",
    preferred_format: str = "mp4",
    title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload a YouTube video to Google Cloud Storage using Apify.
    
    Args:
        youtube_url: YouTube video URL
        preferred_quality: Video quality preference (default: "480p")
        preferred_format: Video format preference (default: "mp4")
        title: Optional title for the video
    
    Returns:
        Dictionary with video information including:
        - downloadedFileUrl: GCP URL of the uploaded video
        - id: YouTube video ID
        - other metadata from Apify
    
    Raises:
        ValueError: If configuration is invalid
        RuntimeError: If Apify upload fails
    """
    # Validate configuration
    if not settings.APIFY_API_KEY:
        raise ValueError("APIFY_API_KEY environment variable is required")
    if not settings.GCP_BUCKET_NAME:
        raise ValueError("GCP_BUCKET_NAME environment variable is required")
    
    # Load GCP service key
    try:
        service_key = load_gcp_service_key()
    except Exception as e:
        logger.error("Failed to load GCP service key: %s", e)
        raise
    
    # Initialize Apify client
    client = ApifyClient(settings.APIFY_API_KEY)
    
    # Prepare run input
    run_input = {
        "videos": [{"url": youtube_url}],
        "preferredQuality": preferred_quality,
        "preferredFormat": preferred_format,
        "filenameTemplateParts": ["title"],
        
        # GCP configuration
        "googleCloudServiceKey": json.dumps(service_key),
        "googleCloudBucketName": settings.GCP_BUCKET_NAME,
    }
    
    logger.info("Starting Apify actor to download YouTube video: %s", youtube_url)
    
    try:
        # Run the Apify actor
        run = client.actor(settings.APIFY_ACTOR_ID).call(run_input=run_input)
        
        # Wait for completion and get results
        logger.info("Apify run started: %s", run.get("id"))
        
        # Get results from the dataset
        results = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)
        
        if not results:
            raise RuntimeError("No results returned from Apify actor")
        
        result = results[0]
        
        # Extract the GCP URL
        downloaded_file_url = result.get("downloadedFileUrl")
        if not downloaded_file_url:
            raise RuntimeError("No downloadedFileUrl in Apify results")
        
        logger.info("Successfully uploaded YouTube video to GCP: %s", downloaded_file_url)
        
        return result
        
    except Exception as e:
        logger.error("Error uploading YouTube video to GCP: %s", e)
        raise RuntimeError(f"Failed to upload YouTube video to GCP: {str(e)}")
