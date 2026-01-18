"""Google Cloud Storage utilities."""
import logging
from pathlib import Path
from typing import Optional, Tuple
from google.cloud import storage
from google.oauth2 import service_account
import uuid

from config import settings

logger = logging.getLogger(__name__)


def upload_file_to_gcp(local_file_path: Path, blob_name: Optional[str] = None) -> tuple[str, str]:
    """
    Upload a local file to Google Cloud Storage.

    Args:
        local_file_path: Path to the local file to upload
        blob_name: Optional blob name in GCP. If None, generates a unique name.

    Returns:
        Tuple of (bucket_name, blob_path)

    Raises:
        ValueError: If service key is missing or bucket name is not configured
        RuntimeError: If upload fails
    """
    if not settings.GCP_BUCKET_NAME:
        raise ValueError("GCP_BUCKET_NAME environment variable is required")

    # Load GCP service key
    service_key_path = settings.GCP_SERVICE_KEY_PATH
    if not service_key_path.exists():
        raise ValueError(
            f"GCP service key file not found: {service_key_path}. "
            f"Cannot upload to GCP without authentication."
        )

    try:
        # Initialize GCS client
        credentials = service_account.Credentials.from_service_account_file(
            str(service_key_path)
        )
        client = storage.Client(credentials=credentials,
                                project=credentials.project_id)

        # Get bucket
        bucket = client.bucket(settings.GCP_BUCKET_NAME)

        # Generate blob name if not provided
        if blob_name is None:
            file_ext = local_file_path.suffix or ".mp4"
            blob_name = f"temp_uploads/{uuid.uuid4()}{file_ext}"

        # Upload file
        blob = bucket.blob(blob_name)
        logger.info("Uploading file to GCP: %s -> gs://%s/%s",
                    local_file_path, settings.GCP_BUCKET_NAME, blob_name)
        blob.upload_from_filename(str(local_file_path))

        logger.info("Successfully uploaded file to GCP: gs://%s/%s",
                    settings.GCP_BUCKET_NAME, blob_name)
        return settings.GCP_BUCKET_NAME, blob_name

    except Exception as e:
        logger.error("Error uploading file to GCP: %s", e)
        raise RuntimeError(f"Failed to upload file to GCP: {str(e)}")


def parse_gcp_url(url: str) -> Tuple[str, str]:
    """
    Parse a GCP URL to extract bucket name and blob path.

    Supports:
    - gs://bucket-name/path/to/file
    - https://storage.googleapis.com/bucket-name/path/to/file
    - https://storage.cloud.google.com/bucket-name/path/to/file

    Args:
        url: GCP URL

    Returns:
        Tuple of (bucket_name, blob_path)
    """
    if url.startswith("gs://"):
        # gs://bucket-name/path/to/file
        path = url[5:]  # Remove "gs://"
        parts = path.split("/", 1)
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[1]

    elif "storage.googleapis.com" in url:
        # https://storage.googleapis.com/bucket-name/path/to/file
        # Remove protocol and domain
        import urllib.parse

        if url.startswith("https://storage.googleapis.com/"):
            path = url[len("https://storage.googleapis.com/"):]
        elif url.startswith("http://storage.googleapis.com/"):
            path = url[len("http://storage.googleapis.com/"):]
        else:
            raise ValueError(f"Invalid GCP URL format: {url}")

        # URL decode the path (handles %20 for spaces, etc.)
        path = urllib.parse.unquote(path)

        parts = path.split("/", 1)
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[1]

    elif "storage.cloud.google.com" in url:
        # https://storage.cloud.google.com/bucket-name/path/to/file
        # Remove protocol and domain using proper prefix matching
        import urllib.parse

        if url.startswith("https://storage.cloud.google.com/"):
            path = url[len("https://storage.cloud.google.com/"):]
        elif url.startswith("http://storage.cloud.google.com/"):
            path = url[len("http://storage.cloud.google.com/"):]
        else:
            raise ValueError(f"Invalid GCP URL format: {url}")

        # URL decode the path (handles %20 for spaces, etc.)
        path = urllib.parse.unquote(path)

        parts = path.split("/", 1)
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[1]

    else:
        raise ValueError(
            f"Unsupported GCP URL format: {url}. Use gs://, https://storage.googleapis.com/, or https://storage.cloud.google.com/"
        )
