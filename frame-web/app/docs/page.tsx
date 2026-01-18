'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from 'react';
import Link from 'next/link';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { Copy, Check } from 'lucide-react';
import type { Variants } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CodeBlock = ({ code, title }: { code: string; title?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-lg border border-[#2B2B2B] bg-[#1C1C1C] overflow-hidden">
            {title && (
                <div className="px-4 py-2 bg-[#2B2B2B]/50 border-b border-[#2B2B2B] text-[#737373] text-xs font-mono">
                    {title}
                </div>
            )}
            <div className="relative">
                <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
                    <code className="text-[#a1a1aa] font-mono">{code}</code>
                </pre>
                <TooltipProvider>
                    <Tooltip open={copied}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleCopy}
                                className="absolute top-3 right-3 p-2 rounded-md bg-[#2B2B2B] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#3a3a3a]"
                            >
                                {copied ? (
                                    <Check size={14} className="text-green-400" />
                                ) : (
                                    <Copy size={14} className="text-[#737373]" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>copied</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState<string>('overview');

    const container: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    const item: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { 
            opacity: 1, 
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    const sections = [
        { id: 'overview', label: 'overview' },
        { id: 'quickstart', label: 'quick start' },
        { id: 'authentication', label: 'authentication' },
        { id: 'endpoints', label: 'endpoints' },
        { id: 'schemas', label: 'schemas' },
        { id: 'examples', label: 'examples' },
    ];

    return (
        <main className="min-h-screen bg-[#1C1C1C] flex flex-col overflow-auto">
            {/* Navigation */}
            <motion.nav 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    duration: 0.8,
                    ease: "easeOut",
                    delay: 0.1
                }}
                className="static w-full px-4 py-20"
            >
                <div className="max-w-[660px] mx-auto flex justify-center gap-2">
                    <Link href="/">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            frame
                        </Button>
                    </Link>
                    <Link href="/docs">
                        <Button 
                            variant="ghost" 
                            className="text-white hover:text-white hover:bg-[#2B2B2B]"
                        >
                            docs
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            dashboard
                        </Button>
                    </Link>
                    <Link href="/waitlist">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            waitlist
                        </Button>
                    </Link>
                </div>
            </motion.nav>

            {/* Main content */}
            <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="flex-grow flex justify-center px-4 pt-2 pb-20"
            >
                <div className="max-w-[660px] w-full">
                    {/* Title section */}
                    <motion.div variants={item} className="text-white text-[15px] leading-relaxed">
                        <motion.h1 variants={item} className="text-[15px] font-normal text-white mb-1">
                            frame api documentation
                        </motion.h1>
                        <motion.div variants={item} className="space-y-0 mb-6">
                            <TextShimmer
                              duration={4}
                              spread={0.5}
                              className="[--base-color:#a1a1aa] [--base-gradient-color:#d4d4d4]"
                            >
                              Everything you need to integrate Frame into your application.
                            </TextShimmer>
                        </motion.div>

                        {/* Section Navigation */}
                        <motion.div variants={item} className="flex flex-wrap gap-2 mb-8">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                        activeSection === section.id
                                            ? 'bg-[#2B2B2B] text-white'
                                            : 'text-[#737373] hover:text-white hover:bg-[#2B2B2B]/50'
                                    }`}
                                >
                                    {section.label}
                                </button>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Frame is a video processing API that extracts structured data from any video. 
                                    Send us a URL, get back JSON with frame-by-frame descriptions, key topics, and metadata.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">features</h2>
                                    <ul className="space-y-2 text-[#a1a1aa]">
                                        <li>- extract frames at configurable intervals (1-60 seconds)</li>
                                        <li>- AI-generated descriptions using SmolVLM-Instruct</li>
                                        <li>- direct YouTube URL support via Apify</li>
                                        <li>- secure API key authentication</li>
                                        <li>- paginated video retrieval</li>
                                        <li>- Google Cloud Storage integration</li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">base url</h2>
                                    <CodeBlock code="http://localhost:8000" />
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">supported formats</h2>
                                    <p className="text-[#a1a1aa]">
                                        .mp4, .avi, .mov, .mkv, .webm, .flv, .wmv (max 500MB)
                                    </p>
                                </div>
                        </motion.div>
                    )}

                    {/* Quick Start Section */}
                    {activeSection === 'quickstart' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Get up and running with Frame API in under 5 minutes.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">1. generate an api key</h2>
                                    <CodeBlock 
                                        title="request"
                                        code={`curl -X POST "http://localhost:8000/api-keys/generate"`}
                                    />
                                    <CodeBlock 
                                        title="response"
                                        code={`{
  "apiKey": "frame_abc123...",
  "createdAt": "2024-01-15T10:30:00Z",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">2. process a video</h2>
                                    <CodeBlock 
                                        title="request"
                                        code={`curl -X POST "http://localhost:8000/videos/process-url" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://storage.googleapis.com/bucket/video.mp4",
    "frameInterval": 5,
    "title": "My Video"
  }'`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">3. retrieve your videos</h2>
                                    <CodeBlock 
                                        title="request"
                                        code={`curl "http://localhost:8000/api/videos" \\
  -H "X-API-Key: frame_abc123..."`}
                                    />
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">environment variables</h2>
                                    <CodeBlock 
                                        title=".env"
                                        code={`# required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key

# optional
MODEL_ID=HuggingFaceTB/SmolVLM-Instruct
UPLOAD_DIR=./uploads
MAX_VIDEO_SIZE=500
FRAME_INTERVAL=5

# for youtube uploads
APIFY_API_KEY=your-apify-key
GCP_BUCKET_NAME=your-bucket-name
GCP_SERVICE_KEY_PATH=./service-key.json`}
                                    />
                                </div>
                        </motion.div>
                    )}

                    {/* Authentication Section */}
                    {activeSection === 'authentication' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Frame uses API keys to authenticate requests to protected endpoints. 
                                    Pass your key via the X-API-Key header.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">generating api keys</h2>
                                    <CodeBlock 
                                        code={`curl -X POST "http://localhost:8000/api-keys/generate"

# response:
{
  "apiKey": "frame_7kX9mN2pQ4rS1tU6vW8xY0zA3bC5dE",
  "createdAt": "2024-01-15T10:30:00Z",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">using api keys</h2>
                                    <CodeBlock 
                                        code={`curl "http://localhost:8000/api/videos" \\
  -H "X-API-Key: frame_7kX9mN2pQ4rS1tU6vW8xY0zA3bC5dE"

# without api key:
{
  "detail": "API key required. Please provide X-API-Key header."
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">protected endpoints</h2>
                                    <ul className="space-y-2 text-[#a1a1aa]">
                                        <li>- GET /api/videos - list all videos</li>
                                        <li>- GET /api/videos/{'{video_id}'} - get specific video</li>
                                    </ul>
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">public endpoints</h2>
                                    <p className="text-[#a1a1aa]">
                                        Video upload and processing endpoints (/videos/upload, /videos/process-url) 
                                        are currently public to allow easy integration.
                                    </p>
                                </div>
                        </motion.div>
                    )}

                    {/* Endpoints Section */}
                    {activeSection === 'endpoints' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Complete reference for all available API endpoints.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">health & info</h2>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">returns api name and version</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/health</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">health check endpoint</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">api keys</h2>
                                    <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400">POST</span>
                                            <code className="text-white text-sm">/api-keys/generate</code>
                                        </div>
                                        <p className="text-[#737373] text-sm">generate a new api key</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">video processing</h2>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400">POST</span>
                                                <code className="text-white text-sm">/videos/upload</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">upload and process a video file</p>
                                            <p className="text-[#737373] text-xs mt-1">params: frame_interval (1-60), title (optional)</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400">POST</span>
                                                <code className="text-white text-sm">/videos/youtube-upload</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">download youtube video to gcp</p>
                                            <p className="text-[#737373] text-xs mt-1">body: url, preferredQuality, preferredFormat, title</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400">POST</span>
                                                <code className="text-white text-sm">/videos/process-url</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">process a video from url</p>
                                            <p className="text-[#737373] text-xs mt-1">body: url, frameInterval, title</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">video retrieval</h2>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/videos</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">list all videos (public)</p>
                                            <p className="text-[#737373] text-xs mt-1">params: skip, limit (1-100)</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/videos/{'{video_id}'}</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">get video by id with summaries</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/videos/{'{video_id}'}/summaries</code>
                                            </div>
                                            <p className="text-[#737373] text-sm">get paginated summaries</p>
                                            <p className="text-[#737373] text-xs mt-1">params: skip, limit (1-1000)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">protected endpoints (requires X-API-Key)</h2>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/api/videos</code>
                                                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">auth</span>
                                            </div>
                                            <p className="text-[#737373] text-sm">list all videos with pagination</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#2B2B2B]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-white text-sm">/api/videos/{'{video_id}'}</code>
                                                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">auth</span>
                                            </div>
                                            <p className="text-[#737373] text-sm">get video by id with summaries</p>
                                        </div>
                                    </div>
                                </div>
                        </motion.div>
                    )}

                    {/* Schemas Section */}
                    {activeSection === 'schemas' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Reference for all request and response data structures.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">VideoResponse</h2>
                                    <CodeBlock 
                                        code={`{
  "id": "uuid",
  "videoUrl": "string",
  "title": "string | null",
  "duration": "string",         // "MM:SS" or "HH:MM:SS"
  "status": "string",           // "processing" | "completed" | "failed"
  "keyTopics": "string | null",
  "frameInterval": "integer",
  "totalFrames": "integer",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "summaries": [VideoSummaryResponse]
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">VideoSummaryResponse</h2>
                                    <CodeBlock 
                                        code={`{
  "id": "uuid",
  "videoId": "uuid",
  "timestamp": "string",        // "0:02", "1:30"
  "timestampSeconds": "number",
  "description": "string",
  "frameNumber": "integer",
  "createdAt": "datetime"
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">ProcessUrlRequest</h2>
                                    <CodeBlock 
                                        code={`{
  "url": "string",              // required
  "frameInterval": "integer",   // 1-60, default 5
  "title": "string"             // optional
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">YouTubeUploadRequest</h2>
                                    <CodeBlock 
                                        code={`{
  "url": "string",              // required
  "preferredQuality": "string", // "480p" default
  "preferredFormat": "string",  // "mp4" default
  "title": "string"             // optional
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">error responses</h2>
                                    <CodeBlock 
                                        code={`// standard error
{
  "detail": "Error message"
}

// validation error
{
  "detail": [
    {
      "loc": ["body", "url"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}`}
                                    />
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">http status codes</h2>
                                    <ul className="space-y-2 text-[#a1a1aa]">
                                        <li>- 200: success</li>
                                        <li>- 400: bad request (invalid format, file too large)</li>
                                        <li>- 401: unauthorized (missing or invalid api key)</li>
                                        <li>- 404: not found</li>
                                        <li>- 422: validation error</li>
                                        <li>- 500: internal server error</li>
                                    </ul>
                                </div>
                        </motion.div>
                    )}

                    {/* Examples Section */}
                    {activeSection === 'examples' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[15px] leading-relaxed space-y-6"
                        >
                                <p className="text-[#a1a1aa]">
                                    Integration examples in popular programming languages.
                                </p>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">typescript</h2>
                                    <CodeBlock 
                                        title="api-client.ts"
                                        code={`const API_URL = 'http://localhost:8000';

// Generate API Key
export async function generateApiKey() {
  const res = await fetch(\`\${API_URL}/api-keys/generate\`, {
    method: 'POST',
  });
  return res.json();
}

// Process Video URL
export async function processVideo(
  url: string,
  frameInterval = 5,
  title?: string
) {
  const res = await fetch(\`\${API_URL}/videos/process-url\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, frameInterval, title }),
  });
  return res.json();
}

// Get Videos (with API Key)
export async function getVideos(apiKey: string) {
  const res = await fetch(\`\${API_URL}/api/videos\`, {
    headers: { 'X-API-Key': apiKey },
  });
  return res.json();
}`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">python</h2>
                                    <CodeBlock 
                                        title="frame_client.py"
                                        code={`import requests

API_URL = "http://localhost:8000"

def generate_api_key():
    res = requests.post(f"{API_URL}/api-keys/generate")
    return res.json()

def process_video(url, frame_interval=5, title=None):
    payload = {"url": url, "frameInterval": frame_interval}
    if title:
        payload["title"] = title
    res = requests.post(
        f"{API_URL}/videos/process-url",
        json=payload
    )
    return res.json()

def get_videos(api_key):
    res = requests.get(
        f"{API_URL}/api/videos",
        headers={"X-API-Key": api_key}
    )
    return res.json()

# usage
key_data = generate_api_key()
api_key = key_data.get("apiKey")

video = process_video(
    url="https://storage.googleapis.com/bucket/video.mp4",
    frame_interval=5
)
print(f"Processed: {video['id']}")`}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-white text-[15px]">curl</h2>
                                    <CodeBlock 
                                        title="process video from gcp"
                                        code={`curl -X POST "http://localhost:8000/videos/process-url" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "gs://bucket/video.mp4", "frameInterval": 5}'`}
                                    />
                                    <CodeBlock 
                                        title="upload youtube video"
                                        code={`curl -X POST "http://localhost:8000/videos/youtube-upload" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://youtube.com/watch?v=VIDEO_ID"}'`}
                                    />
                                    <CodeBlock 
                                        title="upload local file"
                                        code={`curl -X POST "http://localhost:8000/videos/upload?frame_interval=5" \\
  -F "file=@video.mp4"`}
                                    />
                                </div>

                                <div className="space-y-4 pb-8">
                                    <h2 className="text-white text-[15px]">database schema</h2>
                                    <CodeBlock 
                                        title="supabase_schema.sql"
                                        code={`-- videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  title TEXT,
  duration TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  key_topics TEXT,
  frame_interval INTEGER DEFAULT 2,
  total_frames INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- video_summaries table
CREATE TABLE video_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  timestamp_seconds NUMERIC NOT NULL,
  description TEXT NOT NULL,
  frame_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);`}
                                    />
                                </div>
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </main>
    );
}
