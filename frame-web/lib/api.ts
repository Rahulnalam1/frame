const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface YouTubeUploadResponse {
  success: boolean;
  gcpUrl: string;
  videoId?: string;
  title?: string;
  metadata?: any;
}

export interface ProcessUrlResponse {
  id: string;
  videoUrl: string;
  title?: string;
  duration: string;
  status: string;
  keyTopics?: string;
  frameInterval: number;
  totalFrames: number;
  createdAt: string;
  updatedAt: string;
  summaries?: VideoSummary[];
}

export interface VideoSummary {
  id: string;
  videoId: string;
  timestamp: string;
  timestampSeconds: number;
  description: string;
  frameNumber: number;
  createdAt: string;
}

export interface ApiKeyResponse {
  apiKey?: string;
  api_key?: string; // Handle snake_case from backend
  createdAt?: string;
  created_at?: string;
  id: string;
}

export interface VideoListResponse {
  videos: ProcessUrlResponse[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Upload a YouTube video to GCP
 */
export async function uploadYouTubeVideo(
  url: string,
  title?: string,
  preferredQuality: string = '480p',
  preferredFormat: string = 'mp4'
): Promise<YouTubeUploadResponse> {
  const response = await fetch(`${API_URL}/videos/youtube-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      title,
      preferredQuality,
      preferredFormat,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Process a video from a URL (GCP URL or regular URL)
 */
export async function processVideoUrl(
  url: string,
  frameInterval: number = 5,
  title?: string
): Promise<ProcessUrlResponse> {
  const response = await fetch(`${API_URL}/videos/process-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      frameInterval,
      title,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a new API key
 */
export async function generateApiKey(): Promise<ApiKeyResponse> {
  const response = await fetch(`${API_URL}/api-keys/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
  },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all videos (requires API key)
 */
export async function getVideos(
  apiKey: string,
  skip: number = 0,
  limit: number = 10
): Promise<VideoListResponse> {
  const response = await fetch(
    `${API_URL}/api/videos?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get a single video by ID (requires API key)
 */
export async function getVideoById(
  videoId: string,
  apiKey: string
): Promise<ProcessUrlResponse> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
