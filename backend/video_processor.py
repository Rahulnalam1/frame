# video_processor.py
import modal
import json
from typing import List, Dict

app = modal.App("video-frame-processor")

# Minimal FFmpeg install
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("numpy==1.26.4")
    .pip_install(
        "accelerate>=0.25.0",
        "google-cloud-storage==2.14.0",
        "opencv-python-headless==4.10.0.84",
        "pillow==10.1.0",
        "torch==2.1.0",
        "transformers==4.46.3",
    )
)


@app.function(
    image=image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("gcp-secret")],
    memory=16384,
)
def process_video_on_gpu(
    gcp_bucket_name: str,
    gcp_blob_path: str,
    interval: int = 2,
    batch_size: int = 8,
    model_id: str = "HuggingFaceTB/SmolVLM-Instruct"
) -> List[Dict]:
    """Process video frames on Modal GPU."""
    import cv2
    import torch
    import subprocess
    from PIL import Image
    from transformers import AutoProcessor, AutoModelForVision2Seq
    from google.cloud import storage
    from google.oauth2 import service_account
    import os
    import json
    import tempfile

    print(f"Starting video processing: {gcp_blob_path}")
    print(f"GPU available: {torch.cuda.is_available()}")

    # Download video from GCP
    print("Downloading video from GCP...")
    credentials_json = os.environ.get("GCP_SERVICE_KEY")
    credentials_dict = json.loads(credentials_json)
    credentials = service_account.Credentials.from_service_account_info(
        credentials_dict)

    storage_client = storage.Client(credentials=credentials)
    bucket = storage_client.bucket(gcp_bucket_name)
    blob = bucket.blob(gcp_blob_path)

    with tempfile.NamedTemporaryFile(delete=False, suffix='_original.mp4') as tmp_file:
        blob.download_to_filename(tmp_file.name)
        original_video_path = tmp_file.name

    # Convert to H.264
    print("Converting video to H.264...")
    with tempfile.NamedTemporaryFile(delete=False, suffix='_converted.mp4') as converted_file:
        converted_video_path = converted_file.name

    ffmpeg_cmd = [
        'ffmpeg', '-i', original_video_path,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-y', converted_video_path
    ]

    subprocess.run(ffmpeg_cmd, capture_output=True, check=True)
    print("Video converted")

    try:
        # Extract frames
        print("Extracting frames...")
        frames, timestamps = extract_frames(converted_video_path, interval)
        print(f"Extracted {len(frames)} frames")

        # Load model
        print(f"Loading model: {model_id}")
        processor = AutoProcessor.from_pretrained(model_id)
        model = AutoModelForVision2Seq.from_pretrained(
            model_id, torch_dtype=torch.float16, device_map="auto"
        )
        model.eval()
        print("Model loaded")

        # Process frames
        descriptions = []
        for i in range(0, len(frames), batch_size):
            batch = frames[i:i+batch_size]
            batch_descriptions = process_batch(batch, model, processor)
            descriptions.extend(batch_descriptions)
            print(
                f"Processed {min(i+batch_size, len(frames))}/{len(frames)} frames")

        summaries = []
        for i, (ts, desc) in enumerate(zip(timestamps, descriptions)):
            summaries.append({
                "timestamp": format_timestamp(ts),
                "timestamp_seconds": ts,
                "description": desc,
                "frame_number": i
            })

        return summaries
    finally:
        os.remove(original_video_path)
        os.remove(converted_video_path)


def extract_frames(video_path: str, interval: int = 2):
    import cv2
    from PIL import Image

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval)
    frames, timestamps = [], []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(rgb_frame))
            timestamps.append(frame_count / fps)
        frame_count += 1

    cap.release()
    return frames, timestamps


def process_batch(images, model, processor):
    import torch

    descriptions = []

    # Process each image individually (batching doesn't work well with this model)
    for image in images:
        messages = [{
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": "Describe what's happening in this video."}
            ]
        }]

        prompt_text = processor.apply_chat_template(
            messages, add_generation_prompt=True)
        inputs = processor(text=prompt_text, images=[
                           image], return_tensors="pt")

        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(**inputs, max_new_tokens=100)

        decoded = processor.decode(outputs[0], skip_special_tokens=True)
        desc = decoded.split(
            "Assistant:")[-1].strip() if "Assistant:" in decoded else decoded.strip()
        descriptions.append(desc)

    return descriptions


def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours > 0 else f"{minutes}:{secs:02d}"


@app.local_entrypoint()
def test():
    """Test the Modal function locally."""
    result = process_video_on_gpu.remote(
        gcp_bucket_name="youtube_storage_nex",
        # Try the other video
        gcp_blob_path="_Td7JjCTfyc_30 second animation assignment.mp4.mp4",
        interval=2,
        batch_size=8
    )
    print(json.dumps(result[:3], indent=2))  # Print first 3 results
# # modal_video_processor.py
# import modal
# import json
# from typing import List, Dict

# # Create Modal app
# app = modal.App("video-frame-processor")

# # Define the container image with all dependencies
# image = (
#     modal.Image.debian_slim(python_version="3.11")
#     .apt_install(
#         "ffmpeg",
#         "libavcodec-extra"
#     )
#     .pip_install("numpy==1.26.4")
#     .pip_install(
#         "accelerate>=0.25.0",
#         "google-cloud-storage==2.14.0",
#         "opencv-python-headless==4.10.0.84",
#         "pillow==10.1.0",
#         "torch==2.1.0",
#         "transformers==4.46.3",
#     )
# )

# # Mount your service account key as a secret
# # First, create the secret in Modal dashboard or CLI:
# # modal secret create gcp-secret GOOGLE_APPLICATION_CREDENTIALS=@/path/to/service-key.json


# @app.function(
#     image=image,
#     gpu="T4",  # or "A10G" for faster processing
#     timeout=3600,  # 1 hour max
#     secrets=[modal.Secret.from_name("gcp-secret")],
#     memory=16384,  # 16GB RAM
# )
# def process_video_on_gpu(
#     gcp_bucket_name: str,
#     gcp_blob_path: str,
#     interval: int = 2,
#     batch_size: int = 8,
#     model_id: str = "HuggingFaceTB/SmolVLM-Instruct"
# ) -> List[Dict]:
#     """Process video frames on Modal GPU."""
#     import cv2
#     import torch
#     from PIL import Image
#     from transformers import AutoProcessor, AutoModelForVision2Seq
#     from google.cloud import storage
#     from google.oauth2 import service_account
#     import os
#     import json
#     import tempfile

#     print(f"Starting video processing: {gcp_blob_path}")
#     print(f"GPU available: {torch.cuda.is_available()}")

#     # Download video from GCP
#     print("Downloading video from GCP...")

#     # Load credentials from secret
#     credentials_json = os.environ.get("GCP_SERVICE_KEY")
#     if not credentials_json:
#         raise ValueError("GCP_SERVICE_KEY not found in environment")

#     credentials_dict = json.loads(credentials_json)
#     credentials = service_account.Credentials.from_service_account_info(
#         credentials_dict)

#     storage_client = storage.Client(credentials=credentials)
#     bucket = storage_client.bucket(gcp_bucket_name)
#     blob = bucket.blob(gcp_blob_path)

#     # Create temp file
#     with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
#         blob.download_to_filename(tmp_file.name)
#         video_path = tmp_file.name

#     try:
#         # Extract frames
#         print("Extracting frames...")
#         frames, timestamps = extract_frames(video_path, interval)
#         print(f"Extracted {len(frames)} frames")

#         # Load model
#         print(f"Loading model: {model_id}")
#         processor = AutoProcessor.from_pretrained(model_id)
#         model = AutoModelForVision2Seq.from_pretrained(
#             model_id,
#             torch_dtype=torch.float16,
#             device_map="auto",
#         )
#         model.eval()
#         print("Model loaded successfully")

#         # Process frames in batches
#         print(f"Processing frames with batch size {batch_size}...")
#         descriptions = []

#         for i in range(0, len(frames), batch_size):
#             batch = frames[i:i+batch_size]
#             batch_descriptions = process_batch(batch, model, processor)
#             descriptions.extend(batch_descriptions)
#             print(
#                 f"Processed {min(i+batch_size, len(frames))}/{len(frames)} frames")

#         # Format results
#         summaries = []
#         for i, (ts, desc) in enumerate(zip(timestamps, descriptions)):
#             summaries.append({
#                 "timestamp": format_timestamp(ts),
#                 "timestamp_seconds": ts,
#                 "description": desc,
#                 "frame_number": i
#             })

#         print(f"Completed processing {len(summaries)} frames")
#         return summaries

#     finally:
#         # Cleanup
#         if os.path.exists(video_path):
#             os.remove(video_path)


# def extract_frames(video_path: str, interval: int = 2):
#     """Extract frames from video at specified intervals."""
#     import cv2
#     from PIL import Image

#     cap = cv2.VideoCapture(video_path)
#     if not cap.isOpened():
#         raise ValueError(f"Could not open video file: {video_path}")

#     fps = cap.get(cv2.CAP_PROP_FPS)
#     if fps == 0:
#         cap.release()
#         raise ValueError("Could not determine video FPS")

#     frame_interval = int(fps * interval)
#     frames = []
#     timestamps = []
#     frame_count = 0

#     try:
#         while cap.isOpened():
#             ret, frame = cap.read()
#             if not ret:
#                 break

#             if frame_count % frame_interval == 0:
#                 rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#                 frames.append(Image.fromarray(rgb_frame))
#                 timestamps.append(frame_count / fps)

#             frame_count += 1
#     finally:
#         cap.release()

#     return frames, timestamps


# def process_batch(images, model, processor):
#     """Process a batch of images."""
#     import torch

#     prompt = "Describe what's happening in this scene."

#     # Prepare inputs for batch
#     messages = [{
#         "role": "user",
#         "content": [{"type": "image"}, {"type": "text", "text": prompt}]
#     }]

#     prompt_text = processor.apply_chat_template(
#         messages, add_generation_prompt=True)
#     inputs = processor(
#         text=[prompt_text] * len(images),
#         images=images,
#         return_tensors="pt",
#         padding=True
#     )

#     # Move to GPU
#     device = next(model.parameters()).device
#     inputs = {k: v.to(device) for k, v in inputs.items()}

#     with torch.no_grad():
#         outputs = model.generate(**inputs, max_new_tokens=100)

#     # Decode outputs
#     descriptions = []
#     for output in outputs:
#         decoded = processor.decode(output, skip_special_tokens=True)
#         if "Assistant:" in decoded:
#             descriptions.append(decoded.split("Assistant:")[-1].strip())
#         else:
#             descriptions.append(decoded.strip())

#     return descriptions


# def format_timestamp(seconds: float) -> str:
#     """Format timestamp in seconds to MM:SS or HH:MM:SS."""
#     hours = int(seconds // 3600)
#     minutes = int((seconds % 3600) // 60)
#     secs = int(seconds % 60)

#     if hours > 0:
#         return f"{hours}:{minutes:02d}:{secs:02d}"
#     else:
#         return f"{minutes}:{secs:02d}"


# # Local test function
# @app.local_entrypoint()
# def test():
#     """Test the Modal function locally."""
#     result = process_video_on_gpu.remote(
#         gcp_bucket_name="youtube_storage_nex",
#         gcp_blob_path="_Td7JjCTfyc_30 second animation assignment.mp4.mp4",
#         interval=2,
#         batch_size=8
#     )
#     print(json.dumps(result, indent=2))
