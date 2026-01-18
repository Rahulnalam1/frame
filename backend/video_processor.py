"""Video processing functions for frame extraction and summarization."""
import cv2
import torch
from PIL import Image
from typing import List, Tuple
from transformers import AutoProcessor, AutoModelForVision2Seq
import logging

from config import settings

logger = logging.getLogger(__name__)

# Global model and processor (loaded on first use)
_model = None
_processor = None


def get_device():
    """Determine the best available device for model inference."""
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    else:
        return "cpu"


def load_model():
    """Load the vision model and processor (singleton pattern)."""
    global _model, _processor

    if _model is not None and _processor is not None:
        return _model, _processor

    try:
        logger.info(f"Loading model: {settings.MODEL_ID}")
        device = get_device()
        logger.info(f"Using device: {device}")

        _processor = AutoProcessor.from_pretrained(settings.MODEL_ID)

        # Load model first, then handle dtype and device separately
        # This avoids issues with unsupported parameters
        _model = AutoModelForVision2Seq.from_pretrained(settings.MODEL_ID)

        # Convert dtype based on device
        if device == "cpu":
            # For CPU, use float32
            _model = _model.to(dtype=torch.float32)
        else:
            # For GPU/MPS, use float16 for efficiency
            _model = _model.to(dtype=torch.float16)

        # Move to device
        if device == "mps":
            _model = _model.to("mps")
        elif device == "cuda":
            _model = _model.to("cuda")
        # CPU is already handled by default

        _model.eval()
        logger.info("Model loaded successfully")

        return _model, _processor
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise


def extract_frames(video_path: str, interval: int = 2) -> Tuple[List[Image.Image], List[float]]:
    """
    Extract frames from a video at specified intervals.

    Args:
        video_path: Path to the video file
        interval: Seconds between frames (default: 2)

    Returns:
        Tuple of (frames list, timestamps list)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        cap.release()
        raise ValueError("Could not determine video FPS")

    frame_interval = int(fps * interval)
    frames = []
    frame_count = 0
    timestamps = []

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb_frame))
                timestamps.append(frame_count / fps)

            frame_count += 1
    finally:
        cap.release()

    return frames, timestamps


def summarize_frame(image: Image.Image, prompt: str = "Describe what's happening in this scene.") -> str:
    """
    Generate a summary/description for a single frame using the vision model.

    Args:
        image: PIL Image object
        prompt: Text prompt for the model

    Returns:
        Description string
    """
    model, processor = load_model()

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": prompt}
            ]
        }
    ]

    prompt_text = processor.apply_chat_template(
        messages, add_generation_prompt=True)
    inputs = processor(text=prompt_text, images=[image], return_tensors="pt")

    # Move inputs to the same device as the model
    device = next(model.parameters()).device
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=100)

    # Decode the output
    decoded = processor.decode(outputs[0], skip_special_tokens=True)

    # Extract just the assistant's response (remove the prompt text)
    # The model returns the full conversation, we want just the assistant part
    if "Assistant:" in decoded:
        assistant_response = decoded.split("Assistant:")[-1].strip()
        return assistant_response
    else:
        # Fallback: return the decoded text as-is
        return decoded.strip()


def format_timestamp(seconds: float) -> str:
    """
    Format timestamp in seconds to MM:SS or HH:MM:SS format.

    Args:
        seconds: Timestamp in seconds

    Returns:
        Formatted timestamp string
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"


def get_video_duration(video_path: str) -> float:
    """
    Get the duration of a video in seconds.

    Args:
        video_path: Path to the video file

    Returns:
        Duration in seconds
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        if fps > 0:
            duration = frame_count / fps
            return duration
        else:
            return 0.0
    finally:
        cap.release()


def process_video(video_path: str, interval: int = 2) -> List[dict]:
    """
    Process a video and generate summaries for frames at specified intervals.

    Args:
        video_path: Path to the video file
        interval: Seconds between frames (default: 2)

    Returns:
        List of summary dictionaries with timestamp and description
    """
    logger.info(f"Processing video: {video_path} with interval: {interval}s")

    # Extract frames
    frames, timestamps = extract_frames(video_path, interval)
    logger.info(f"Extracted {len(frames)} frames")

    # Process each frame
    summaries = []
    for i, (frame, ts) in enumerate(zip(frames, timestamps)):
        try:
            logger.info(
                f"Processing frame {i+1}/{len(frames)} at {format_timestamp(ts)}")
            description = summarize_frame(frame)
            summaries.append({
                "timestamp": format_timestamp(ts),
                "timestamp_seconds": ts,
                "description": description,
                "frame_number": i
            })
        except Exception as e:
            logger.error(f"Error processing frame {i+1}: {e}")
            # Continue with other frames even if one fails
            summaries.append({
                "timestamp": format_timestamp(ts),
                "timestamp_seconds": ts,
                "description": f"Error processing frame: {str(e)}",
                "frame_number": i
            })

    logger.info(f"Completed processing {len(summaries)} frames")
    return summaries
