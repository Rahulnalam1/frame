"""Google Cloud Storage video downloader."""
import logging
import tempfile
from pathlib import Path
from typing import Optional
from google.cloud import storage
from google.oauth2 import service_account

from config import settings

logger = logging.getLogger(__name__)


def download_from_gcp(gcp_url: str, output_path: Optional[Path] = None) -> Path:
    """
    Download a video file from Google Cloud Storage.

    Args:
        gcp_url: GCS URL (gs://bucket-name/path/to/file or https://storage.googleapis.com/...)
        output_path: Optional output path. If None, creates a temporary file.

    Returns:
        Path to the downloaded file

    Raises:
        ValueError: If URL is invalid or service key is missing
        RuntimeError: If download fails
    """
    # Load GCP service key
    service_key_path = settings.GCP_SERVICE_KEY_PATH
    if not service_key_path.exists():
        raise ValueError(
            f"GCP service key file not found: {service_key_path}. "
            f"Cannot download from GCP without authentication."
        )

    try:
        # Initialize GCS client
        credentials = service_account.Credentials.from_service_account_file(
            str(service_key_path)
        )
        client = storage.Client(credentials=credentials,
                                project=credentials.project_id)

        # Parse GCP URL
        bucket_name, blob_path = _parse_gcp_url(gcp_url)

        # Get bucket and blob
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)

        if not blob.exists():
            raise ValueError(f"File not found in GCS: {gcp_url}")

        # Determine output path
        if output_path is None:
            # Create temporary file
            file_ext = Path(blob_path).suffix or ".mp4"
            temp_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix=file_ext,
                dir=settings.UPLOAD_DIR
            )
            output_path = Path(temp_file.name)
            temp_file.close()

        # Download the file
        logger.info("Downloading from GCP: %s to %s", gcp_url, output_path)
        blob.download_to_filename(str(output_path))

        logger.info("Successfully downloaded from GCP: %s", output_path)
        return output_path

    except Exception as e:
        logger.error("Error downloading from GCP: %s", e)
        raise RuntimeError(f"Failed to download from GCP: {str(e)}")


def _parse_gcp_url(url: str) -> tuple:
    """
    Parse a GCP URL to extract bucket name and blob path.

    Supports:
    - gs://bucket-name/path/to/file
    - https://storage.googleapis.com/bucket-name/path/to/file
    - https://storage.googleapis.com/bucket-name/path/to/file.mp4

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
        if url.startswith("https://"):
            path = url[26:]  # Remove "https://storage.googleapis.com/"
        elif url.startswith("http://"):
            path = url[25:]  # Remove "http://storage.googleapis.com/"
        else:
            raise ValueError(f"Invalid GCP URL format: {url}")

        parts = path.split("/", 1)
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[1]

    else:
        raise ValueError(
            f"Unsupported GCP URL format: {url}. Use gs:// or https://storage.googleapis.com/")
