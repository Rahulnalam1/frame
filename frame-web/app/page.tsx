'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextScramble } from '@/components/ui/text-scramble';
import { Key, Play, Loader2 } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { uploadYouTubeVideo, processVideoUrl, generateApiKey } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Page() {
    const [key, setKey] = useState(0);
    const [scrambleTrigger, setScrambleTrigger] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [rows, setRows] = useState([
        {
            id: `${Date.now()}-1`,
            videoUrl: "",
            title: "",
            duration: "",
            status: "",
            keyTopics: "",
            height: 40, // Minimum row height
        }
    ]);
    const [currentRowId, setCurrentRowId] = useState(`${Date.now()}-1`);
    const [animatingCells, setAnimatingCells] = useState<Record<string, Record<string, boolean>>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [draggedRow, setDraggedRow] = useState<string | null>(null);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartHeight, setDragStartHeight] = useState(0);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartWidth, setDragStartWidth] = useState(0);
    const [columnWidths, setColumnWidths] = useState({
        videoUrl: 20,
        title: 20,
        duration: 20,
        status: 20,
        keyTopics: 20,
    });
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [processingRows, setProcessingRows] = useState<Record<string, 'idle' | 'uploading' | 'processing' | 'completed' | 'error'>>({});
    const [apiKey, setApiKey] = useState<string>('');

    const extractVideoId = (url: string) => {
        // Extract video ID from various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const fetchVideoData = async () => {
        if (!videoUrl) return;
        
        setIsLoading(true);

        try {
            // Extract video ID from URL
            const videoId = extractVideoId(videoUrl);
            
            if (!videoId) {
                throw new Error("Invalid YouTube URL");
            }

            // Use YouTube Data API v3 to get accurate video information
            const youtubeApiKey = 'AIzaSyACFn2v8Afg_DFfYXncld2CJ683VabPq1A';
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${youtubeApiKey}`;
            
            const youtubeResponse = await fetch(youtubeApiUrl);
            
            if (!youtubeResponse.ok) {
                throw new Error("Failed to fetch video data from YouTube API");
            }

            const youtubeData = await youtubeResponse.json();
            
            if (!youtubeData.items || youtubeData.items.length === 0) {
                throw new Error("Video not found");
            }

            const video = youtubeData.items[0];
            const snippet = video.snippet;
            const contentDetails = video.contentDetails;
            const statistics = video.statistics;
            
            // Parse ISO 8601 duration (e.g., PT15M33S, PT1H2M10S)
            const isoDuration = contentDetails.duration;
            const duration = parseISO8601Duration(isoDuration);
            
            // Check if captions are available
            const hasCaptions = contentDetails.caption === "true";
            const captionStatus = hasCaptions ? "✓ Captions" : "No captions";
            
            // Get view count for additional info
            const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount).toLocaleString() + ' views' : 'N/A';
            
            // Extract key topics from YouTube description (fast display)
            let keyTopics = '';
            
            if (snippet.description) {
                keyTopics = snippet.description
                    .split('\n')[0]
                    .substring(0, 200)
                    .trim();
                
                if (!keyTopics.endsWith('.') && !keyTopics.endsWith('!') && !keyTopics.endsWith('?')) {
                    keyTopics += '...';
                }
            } else {
                keyTopics = `Video by ${snippet.channelTitle} covering topics related to ${snippet.title.substring(0, 50)}.`;
            }

            const videoInfo = {
                title: snippet.title || "Video Title",
                duration: duration,
                status: captionStatus, // Show caption availability instead of "Completed"
                keyTopics: keyTopics,
            };

            // Animate and populate the first row with YouTube data (fast)
            await animateDataPopulation(videoInfo);
            
            console.log('✅ First row populated, fetching related videos...');
            
            // Enhance with Tavily in background (non-blocking)
            enhanceKeyTopicsWithTavily(snippet.title, snippet.channelTitle, currentRowId);
            
            // Immediately fetch and populate related videos in parallel
            setTimeout(() => {
                console.log('⏰ Timeout fired, calling fetchAndPopulateSuggestedVideos');
                fetchAndPopulateSuggestedVideos(videoId, snippet.title);
            }, 500);

        } catch (error) {
            console.error('Error fetching video data:', error);
            await animateDataPopulation({
                title: "Error - Invalid YouTube URL or API issue",
                duration: "0:00",
                status: "Failed",
                keyTopics: error instanceof Error ? error.message : "Error fetching data.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const enhanceKeyTopicsWithTavily = async (videoTitle: string, channelName: string, rowId: string) => {
        try {
            // Run Tavily in background to enhance key topics with AI analysis
            const tavilySearchResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: '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',
                    query: `YouTube video "${videoTitle}" by ${channelName} - what are the main topics and key takeaways?`,
                    search_depth: 'basic', // Use 'basic' for faster response
                    max_results: 3,
                    include_answer: true,
                })
            });

            const tavilyData = await tavilySearchResponse.json();
            
            // If Tavily provides a better answer, update the key topics
            if (tavilyData.answer) {
                let enhancedKeyTopics = tavilyData.answer
                    .replace(/\\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 250);
                
                if (!enhancedKeyTopics.endsWith('.') && !enhancedKeyTopics.endsWith('!') && !enhancedKeyTopics.endsWith('?')) {
                    enhancedKeyTopics += '.';
                }
                
                // Update the row with enhanced key topics
                updateRowData(rowId, { keyTopics: enhancedKeyTopics });
                console.log('Enhanced key topics with Tavily AI analysis');
            }
        } catch (error) {
            console.error('Error enhancing key topics with Tavily (non-blocking):', error);
            // Silently fail - YouTube description is already shown
        }
    };

    const fetchAndPopulateSuggestedVideos = async (originalVideoId: string, videoTitle: string) => {
        try {
            // STRICT CHECK: Only auto-populate up to 5 rows total (1 original + 4 suggested)
            if (rows.length >= 5) {
                console.log("🚫 ALREADY HAVE 5 OR MORE ROWS - NOT ADDING ANY SUGGESTIONS");
                // Add one empty row for manual input only
                const emptyRowId = `${Date.now()}-empty`;
                const emptyRow = {
                    id: emptyRowId,
                    videoUrl: "",
                    title: "",
                    duration: "",
                    status: "",
                    keyTopics: "",
                    height: 40,
                };
                setRows(prev => {
                    // Double check before adding
                    if (prev.length >= 5) {
                        console.log("⚠️ Double-checked: Already at 5 rows, only adding empty row");
                    }
                    return [...prev, emptyRow];
                });
                return;
            }

            console.log('🔍 Fetching related videos for:', videoTitle);
            
            // Use Tavily to find similar YouTube videos (finds the URLs)
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: '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',
                    query: `Find other YouTube videos similar to "${videoTitle}". Show me different related videos on the same topic LITERALLY SIMILAR VIDEOS, imagine basically watching the same video multiple times.`,
                    search_depth: 'basic',
                    max_results: 10,
                    include_domains: ['youtube.com', 'youtu.be'],
                })
            });

            const tavilyData = await tavilyResponse.json();

            if (!tavilyData.results || tavilyData.results.length === 0) {
                console.log("❌ No related videos found from Tavily");
                return;
            }

            // Extract YouTube URLs and filter out duplicates
            const existingUrls = rows.map(row => row.videoUrl);
            const suggestedUrls = tavilyData.results
                .map((result: any) => result.url)
                .filter((url: string) => {
                    const videoId = extractVideoId(url);
                    return videoId && 
                           (url.includes('youtube.com/watch') || url.includes('youtu.be/')) &&
                           !existingUrls.includes(url) &&
                           videoId !== originalVideoId;
                })
                .slice(0, 4); // Get up to 4 suggestions MAX

            if (suggestedUrls.length === 0) {
                console.log("❌ No valid YouTube URLs found after filtering");
                return;
            }

            console.log(`✅ Found ${suggestedUrls.length} similar videos from Tavily`);

            // Extract video IDs from the URLs
            const videoIds = suggestedUrls
                .map((url: string) => extractVideoId(url))
                .filter((id: string | null): id is string => id !== null)
                .join(',');

            if (!videoIds) {
                console.log("❌ Could not extract video IDs");
                return;
            }
            
            // Fetch data for these videos from YouTube API
            const youtubeApiKey = 'AIzaSyACFn2v8Afg_DFfYXncld2CJ683VabPq1A';
            const batchUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${youtubeApiKey}`;
            const batchResponse = await fetch(batchUrl);
            const batchData = await batchResponse.json();

            if (!batchData.items || batchData.items.length === 0) {
                console.log("❌ Failed to fetch video details from YouTube");
                return;
            }

            console.log(`✅ Fetched details for ${batchData.items.length} videos from YouTube API`);

            // CRITICAL: Calculate how many rows we can add - NEVER exceed 5 total
            const currentRowCount = rows.length;
            const spacesAvailable = 5 - currentRowCount;
            const maxRowsToAdd = Math.min(spacesAvailable, batchData.items.length, 4);
            
            // SAFETY CHECK: If we're already at or above 5, don't add any
            if (currentRowCount >= 5 || maxRowsToAdd <= 0) {
                console.log(`🚫 CANNOT ADD ROWS: current=${currentRowCount}, max=5, toAdd=${maxRowsToAdd}`);
                return;
            }
            
            console.log(`📊 STRICT LIMIT: Will add exactly ${maxRowsToAdd} rows (current: ${currentRowCount}, final: ${currentRowCount + maxRowsToAdd})`);

            // Process each video sequentially (one by one)
            for (let i = 0; i < maxRowsToAdd; i++) {
                // SAFETY: Re-check on each iteration
                setRows(prev => {
                    if (prev.length >= 5) {
                        console.log(`🚫 LOOP SAFETY: Already at ${prev.length} rows, stopping at iteration ${i}`);
                        return prev; // Don't add anything
                    }
                    
                    const video = batchData.items[i];
                    const videoId = video.id;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const snippet = video.snippet;
                    const contentDetails = video.contentDetails;
                    
                    // Parse duration
                    const isoDuration = contentDetails.duration;
                    const duration = parseISO8601Duration(isoDuration);
                    
                    // Check if captions are available
                    const hasCaptions = contentDetails.caption === "true";
                    const captionStatus = hasCaptions ? "✓ Captions" : "No captions";
                    
                    // Extract key topics
                    let keyTopics = '';
                    if (snippet.description) {
                        keyTopics = snippet.description
                            .split('\n')[0]
                            .substring(0, 200)
                            .trim();
                        
                        if (!keyTopics.endsWith('.') && !keyTopics.endsWith('!') && !keyTopics.endsWith('?')) {
                            keyTopics += '...';
                        }
                    } else {
                        keyTopics = `Video by ${snippet.channelTitle} covering topics related to ${snippet.title.substring(0, 50)}.`;
                    }

                    const videoInfo = {
                        title: snippet.title || "Video Title",
                        duration: duration,
                        status: captionStatus,
                        keyTopics: keyTopics,
                    };

                    const rowId = `${Date.now()}-${prev.length + 1}-${Math.random()}`;
                    const newRow = {
                        id: rowId,
                        videoUrl: videoUrl,
                        title: "",
                        duration: "",
                        status: "",
                        keyTopics: "",
                        height: 40,
                    };
                    
                    console.log(`➕ Adding row ${prev.length + 1}`);
                    return [...prev, newRow];
                });

                // Wait before adding next row (staggered effect)
                await new Promise(resolve => setTimeout(resolve, 700));

                // Animate the row we just added
                const currentRows = [...rows];
                const justAddedRow = currentRows[currentRows.length - 1];
                if (justAddedRow) {
                    const video = batchData.items[i];
                    const snippet = video.snippet;
                    const contentDetails = video.contentDetails;
                    
                    const isoDuration = contentDetails.duration;
                    const duration = parseISO8601Duration(isoDuration);
                    const hasCaptions = contentDetails.caption === "true";
                    const captionStatus = hasCaptions ? "✓ Captions" : "No captions";
                    
                    let keyTopics = '';
                    if (snippet.description) {
                        keyTopics = snippet.description.split('\n')[0].substring(0, 200).trim();
                        if (!keyTopics.endsWith('.') && !keyTopics.endsWith('!') && !keyTopics.endsWith('?')) {
                            keyTopics += '...';
                        }
                    } else {
                        keyTopics = `Video by ${snippet.channelTitle} covering topics related to ${snippet.title.substring(0, 50)}.`;
                    }

                    const videoInfo = {
                        title: snippet.title || "Video Title",
                        duration: duration,
                        status: captionStatus,
                        keyTopics: keyTopics,
                    };

                    // Animate left to right
                    const rowId = justAddedRow.id;
                    const fields = ['title', 'duration', 'status', 'keyTopics'] as const;
                    for (const field of fields) {
                        setAnimatingCells(prev => ({ ...prev, [rowId]: { [field]: true } }));
                        await new Promise(resolve => setTimeout(resolve, 200));
                        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: videoInfo[field] } : r));
                        await new Promise(resolve => setTimeout(resolve, 100));
                        setAnimatingCells(prev => ({ ...prev, [rowId]: {} }));
                    }

                    console.log(`✅ Completed row ${currentRowCount + i + 1}: ${videoInfo.title}`);
                    enhanceKeyTopicsWithTavily(snippet.title, snippet.channelTitle, rowId);
                }
            }

            // After populating suggested videos, add ONE empty row only if we have exactly 5 rows
            setRows(prev => {
                if (prev.length === 5) {
                    console.log("➕ Adding one empty row for manual input (after 5 suggested)");
                    const emptyRowId = `${Date.now()}-empty`;
                    const emptyRow = {
                        id: emptyRowId,
                        videoUrl: "",
                        title: "",
                        duration: "",
                        status: "",
                        keyTopics: "",
                        height: 40,
                    };
                    return [...prev, emptyRow];
                }
                return prev;
            });

        } catch (error) {
            console.error('❌ Error fetching suggested videos:', error);
        }
    };

    // Helper function to parse ISO 8601 duration format
    const parseISO8601Duration = (duration: string): string => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return "0:00";
        
        const hours = parseInt(match[1] || "0");
        const minutes = parseInt(match[2] || "0");
        const seconds = parseInt(match[3] || "0");
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    };

    const animateDataPopulation = async (data: any) => {
        const fields = ['title', 'duration', 'status', 'keyTopics'];
        
        for (const field of fields) {
            setAnimatingCells(prev => ({ ...prev, [currentRowId]: { [field]: true } }));
            await new Promise(resolve => setTimeout(resolve, 300));
            updateRowData(currentRowId, { [field]: data[field] });
            await new Promise(resolve => setTimeout(resolve, 100));
            setAnimatingCells(prev => ({ ...prev, [currentRowId]: {} }));
        }
    };

    const updateRowData = (rowId: string, updates: any) => {
        setRows(prev => prev.map(row => 
            row.id === rowId ? { ...row, ...updates } : row
        ));
    };

    const handleUrlChange = (rowId: string, url: string) => {
        setVideoUrl(url);
        updateRowData(rowId, { videoUrl: url });
        setCurrentRowId(rowId);
    };

    const handleUrlBlur = async (rowId: string, url: string) => {
        // Auto-analyze when user finishes entering URL
        if (url && url.trim() !== '' && !isLoading) {
            setCurrentRowId(rowId);
            setVideoUrl(url);
            await fetchVideoData();
        }
    };

    const handleKeyPress = async (e: React.KeyboardEvent, rowId: string, url: string) => {
        // Also trigger on Enter key
        if (e.key === 'Enter' && url && url.trim() !== '' && !isLoading) {
            setCurrentRowId(rowId);
            setVideoUrl(url);
            await fetchVideoData();
        }
    };

    const handleMouseDown = (e: React.MouseEvent, rowId: string) => {
        e.preventDefault();
        const row = rows.find(r => r.id === rowId);
        if (row) {
            setDraggedRow(rowId);
            setDragStartY(e.clientY);
            setDragStartHeight(row.height);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (draggedRow) {
            const deltaY = e.clientY - dragStartY;
            const newHeight = Math.max(40, Math.min(300, dragStartHeight + deltaY));
            setRows(prev => prev.map(row => 
                row.id === draggedRow ? { ...row, height: newHeight } : row
            ));
        }
    };

    const handleMouseUp = () => {
        setDraggedRow(null);
        setDraggedColumn(null);
    };

    const handleColumnMouseDown = (e: React.MouseEvent, columnName: string) => {
        e.preventDefault();
        setDraggedColumn(columnName);
        setDragStartX(e.clientX);
        setDragStartWidth(columnWidths[columnName as keyof typeof columnWidths]);
    };

    const handleColumnMouseMove = (e: MouseEvent) => {
        if (draggedColumn) {
            const deltaX = e.clientX - dragStartX;
            const newWidthPercent = dragStartWidth + (deltaX / window.innerWidth) * 100;
            const clampedWidth = Math.max(10, Math.min(50, newWidthPercent));
            
            setColumnWidths(prev => ({
                ...prev,
                [draggedColumn]: clampedWidth,
            }));
        }
    };

    useEffect(() => {
        if (draggedRow) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draggedRow, dragStartY, dragStartHeight, rows]);

    useEffect(() => {
        if (draggedColumn) {
            window.addEventListener('mousemove', handleColumnMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleColumnMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draggedColumn, dragStartX, dragStartWidth, columnWidths]);

    // Start the scramble after initial content has animated in
    useEffect(() => {
        const timer = setTimeout(() => setScrambleTrigger(true), 1200); // delay matches page entrance
        return () => clearTimeout(timer);
    }, [key]);

    // Generate API key on mount
    useEffect(() => {
        const loadApiKey = async () => {
            // Check localStorage first
            const storedKey = localStorage.getItem('frame_api_key');
            if (storedKey) {
                setApiKey(storedKey);
                return;
            }

            // Generate new key
            try {
                const response = await generateApiKey();
                console.log('API key response:', response);
                // Handle both camelCase and snake_case response formats
                const key = response.apiKey || response.api_key || '';
                if (key) {
                    setApiKey(key);
                    localStorage.setItem('frame_api_key', key);
                } else {
                    console.error('No API key in response:', response);
                }
            } catch (error) {
                console.error('Error generating API key:', error);
                // Set a placeholder so user knows something went wrong
                setApiKey('Error generating key - check console');
            }
        };

        loadApiKey();
    }, []);

    const handleUploadAndProcess = async (rowId: string, url: string, title?: string) => {
        if (!url || !url.trim()) {
            alert('Please enter a video URL first');
            return;
        }

        setProcessingRows(prev => ({ ...prev, [rowId]: 'uploading' }));
        updateRowData(rowId, { status: 'Uploading...' });

        try {
            // Step 1: Upload YouTube video to GCP
            const uploadResponse = await uploadYouTubeVideo(url, title);
            
            if (!uploadResponse.success || !uploadResponse.gcpUrl) {
                throw new Error('Failed to upload video to GCP');
            }

            setProcessingRows(prev => ({ ...prev, [rowId]: 'processing' }));
            updateRowData(rowId, { status: 'Processing...' });

            // Step 2: Process the video from GCP URL
            const processResponse = await processVideoUrl(
                uploadResponse.gcpUrl,
                5, // frame interval
                title || uploadResponse.title
            );

            // Update row with processed data
            updateRowData(rowId, {
                status: processResponse.status === 'completed' ? 'Completed' : processResponse.status,
                title: processResponse.title || title || '',
                duration: processResponse.duration,
                keyTopics: processResponse.keyTopics || '',
            });

            setProcessingRows(prev => ({ ...prev, [rowId]: 'completed' }));
        } catch (error) {
            console.error('Error uploading/processing video:', error);
            updateRowData(rowId, { 
                status: 'Error',
                keyTopics: error instanceof Error ? error.message : 'Failed to process video'
            });
            setProcessingRows(prev => ({ ...prev, [rowId]: 'error' }));
        }
    };

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

    return (
        <main className="min-h-screen bg-[#1C1C1C] flex flex-col overflow-auto">
            {/* Navigation */}
            <motion.nav 
                key={`nav-${key}`}
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
                            className="text-white hover:text-white hover:bg-[#2B2B2B]"
                        >
                            frame
                        </Button>
                    </Link>
                    <Link href="/docs">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
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
                key={`content-${key}`}
                variants={container}
                initial="hidden"
                animate="show"
                className="flex-grow flex justify-center px-4 pt-2"
            >
                <div className="max-w-[660px] w-full">
                    {/* Introduction section */}
                    <motion.div variants={item} className="text-white text-[15px] leading-relaxed">
                        <motion.h1 variants={item} className="text-[15px] font-normal text-white mb-1">
                            frame, turn any video content into an API
                        </motion.h1>
                        <motion.div variants={item} className="space-y-0 mb-6">
                            <TextShimmer
                              duration={4}
                              spread={0.5}
                              className="[--base-color:#a1a1aa] [--base-gradient-color:#d4d4d4]"
                            >
                              Extract structured data from any video in 90 seconds. Stripe for video intelligence.
                            </TextShimmer>
                        </motion.div>
                        <motion.p variants={item} className="mb-6">
                        Developers can&apos;t build apps on video content because there&apos;s no infrastructure to extract what&apos;s inside. Frame fixes this—send us a URL, get back JSON with transcript, products, topics, and key moments.
                        </motion.p>
                        <motion.p variants={item}>
                            <TextScramble
                              as="span"
                              className="inline"
                              trigger={scrambleTrigger}
                            >
                              Transform your video content into structured data.
                            </TextScramble>
                        </motion.p>

                        {/* Table Component */}
                        <motion.div variants={item} className="mt-12">
                            <div className="overflow-hidden rounded-lg border border-[#2B2B2B] bg-[#1C1C1C]">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow className="bg-[#2B2B2B]/50 hover:bg-[#2B2B2B]/50 [&>th:not(:last-child)]:border-r [&>th:not(:last-child)]:border-[#2B2B2B]">
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: `${columnWidths.videoUrl}%` }}
                                            >
                                                Video URL
                                                {/* Column Resize Handle */}
                                                <div
                                                    onMouseDown={(e) => handleColumnMouseDown(e, 'videoUrl')}
                                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                    style={{ borderRight: draggedColumn === 'videoUrl' ? '2px solid #737373' : 'none' }}
                                                />
                                            </TableHead>
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: '10%' }}
                                            >
                                                Action
                                            </TableHead>
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: `${columnWidths.title}%` }}
                                            >
                                                Title
                                                <div
                                                    onMouseDown={(e) => handleColumnMouseDown(e, 'title')}
                                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                    style={{ borderRight: draggedColumn === 'title' ? '2px solid #737373' : 'none' }}
                                                />
                                            </TableHead>
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: `${columnWidths.duration}%` }}
                                            >
                                                Duration
                                                <div
                                                    onMouseDown={(e) => handleColumnMouseDown(e, 'duration')}
                                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                    style={{ borderRight: draggedColumn === 'duration' ? '2px solid #737373' : 'none' }}
                                                />
                                            </TableHead>
                            <TableHead 
                                className="h-9 py-2 text-[#737373] text-center relative" 
                                style={{ width: `${columnWidths.status}%` }}
                            >
                                Captions
                                <div
                                    onMouseDown={(e) => handleColumnMouseDown(e, 'status')}
                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                    style={{ borderRight: draggedColumn === 'status' ? '2px solid #737373' : 'none' }}
                                />
                            </TableHead>
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: `${columnWidths.keyTopics}%` }}
                                            >
                                                Key Topics
                                                <div
                                                    onMouseDown={(e) => handleColumnMouseDown(e, 'keyTopics')}
                                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                    style={{ borderRight: draggedColumn === 'keyTopics' ? '2px solid #737373' : 'none' }}
                                                />
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow 
                                                key={row.id} 
                                                className="relative [&>td:not(:last-child)]:border-r [&>td:not(:last-child)]:border-[#2B2B2B] hover:bg-[#2B2B2B]/30"
                                                style={{ height: `${row.height}px` }}
                                            >
                                                <TableCell 
                                                    className="font-medium text-white align-top relative" 
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.videoUrl}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-center px-2">
                                                        <input
                                                            type="text"
                                                            value={row.videoUrl}
                                                            onChange={(e) => handleUrlChange(row.id, e.target.value)}
                                                            onBlur={(e) => handleUrlBlur(row.id, e.target.value)}
                                                            onKeyPress={(e) => handleKeyPress(e, row.id, row.videoUrl)}
                                                            onFocus={(e) => e.target.placeholder = ''}
                                                            className="w-full bg-transparent border-none outline-none focus:outline-none text-white font-medium text-center placeholder:text-[#737373]"
                                                            placeholder="Enter video URL"
                                                            disabled={processingRows[row.id] === 'uploading' || processingRows[row.id] === 'processing'}
                                                        />
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                                <TableCell 
                                                    className="text-[#a1a1aa] align-middle relative" 
                                                    style={{ height: `${row.height}px`, width: '10%' }}
                                                >
                                                    <div className="h-full flex items-center justify-center px-2">
                                                        <Button
                                                            onClick={() => handleUploadAndProcess(row.id, row.videoUrl, row.title)}
                                                            disabled={!row.videoUrl || processingRows[row.id] === 'uploading' || processingRows[row.id] === 'processing'}
                                                            className="bg-[#2B2B2B] hover:bg-[#3a3a3a] text-white text-xs px-3 py-1 h-7"
                                                            size="sm"
                                                        >
                                                            {processingRows[row.id] === 'uploading' || processingRows[row.id] === 'processing' ? (
                                                                <>
                                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                    {processingRows[row.id] === 'uploading' ? 'Uploading' : 'Processing'}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Play className="w-3 h-3 mr-1" />
                                                                    Process
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                                <TableCell 
                                                    className={`text-[#a1a1aa] transition-all duration-300 align-middle relative ${
                                                        animatingCells[row.id]?.title ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.title}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-start pr-2 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                        <p className="text-sm text-left whitespace-nowrap">
                                                            {row.title}
                                                        </p>
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                                <TableCell 
                                                    className={`text-[#a1a1aa] transition-all duration-300 align-middle relative ${
                                                        animatingCells[row.id]?.duration ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.duration}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-center px-2">
                                                        <span className="text-sm">
                                                            {row.duration}
                                                        </span>
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                                <TableCell 
                                                    className={`text-[#a1a1aa] transition-all duration-300 align-middle relative ${
                                                        animatingCells[row.id]?.status ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.status}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-center px-2">
                                                        <span className="text-sm">
                                                            {row.status}
                                                        </span>
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                                <TableCell 
                                                    className={`text-[#a1a1aa] transition-all duration-300 align-middle relative ${
                                                        animatingCells[row.id]?.keyTopics ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.keyTopics}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-start pr-2 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                        <p className="text-sm text-left whitespace-nowrap">
                                                            {row.keyTopics}
                                                        </p>
                                                    </div>
                                                    {/* Row Resize Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleMouseDown(e, row.id)}
                                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                        style={{ borderTop: draggedRow === row.id ? '2px solid #737373' : 'none' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Single row table below */}
                            <div className="mt-12 overflow-hidden rounded-lg border border-[#2B2B2B] bg-[#1C1C1C]">
                                <Table className="table-fixed">
                                    <TableBody>
                                        <TableRow className="hover:bg-[#2B2B2B]/30">
                                            <TableCell 
                                                className="h-12 text-[#737373] text-center border-r border-[#2B2B2B]" 
                                                style={{ width: '15%' }}
                                            >
                                                <div className="flex items-center justify-center">
                                                    <Key size={20} />
                                                </div>
                                            </TableCell>
                                            <TooltipProvider>
                                                <Tooltip open={showCopiedTooltip}>
                                                    <TooltipTrigger asChild>
                                                        <TableCell 
                                                            className="h-12 text-white text-center cursor-pointer font-mono text-xs" 
                                                            style={{ width: '85%' }}
                                                            onClick={async () => {
                                                                if (apiKey) {
                                                                    try {
                                                                        await navigator.clipboard.writeText(apiKey);
                                                                        setShowCopiedTooltip(true);
                                                                        setTimeout(() => setShowCopiedTooltip(false), 2000);
                                                                    } catch (error) {
                                                                        console.error('Failed to copy API key:', error);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {apiKey || 'Generating...'}
                                                        </TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">
                                                        <p>copied to clipboard</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </main>
    );
}