"""Configuration management for the FastAPI backend."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent


class Settings:
    """Application settings loaded from environment variables."""

    # Supabase configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Model configuration
    MODEL_ID: str = os.getenv("MODEL_ID", "HuggingFaceTB/SmolVLM-Instruct")

    # Upload configuration
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
    MAX_VIDEO_SIZE: int = int(os.getenv("MAX_VIDEO_SIZE", "500"))  # MB

    # Allowed video formats
    ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi",
                                ".mov", ".mkv", ".webm", ".flv", ".wmv"}

    # Frame processing
    DEFAULT_FRAME_INTERVAL: int = int(
        os.getenv("FRAME_INTERVAL", "2"))  # seconds

    # Apify configuration
    APIFY_API_KEY: str = os.getenv("APIFY_API_KEY", "")
    APIFY_ACTOR_ID: str = os.getenv("APIFY_ACTOR_ID", "UUhJDfKJT2SsXdclR")

    # Google Cloud Storage configuration
    GCP_BUCKET_NAME: str = os.getenv("GCP_BUCKET_NAME", "")
    GCP_SERVICE_KEY_PATH: Path = Path(
        os.getenv("GCP_SERVICE_KEY_PATH", str(BASE_DIR / "service-key.json"))
    )

    def __init__(self):
        """Initialize settings and create upload directory if it doesn't exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Validate required settings
        if not self.SUPABASE_URL:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not self.SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY environment variable is required")


# Global settings instance
settings = Settings()
