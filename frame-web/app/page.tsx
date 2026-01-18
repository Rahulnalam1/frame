'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextScramble } from '@/components/ui/text-scramble';
import { Key } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { generateApiKey, uploadYouTubeVideo, processVideoUrl } from '@/lib/api';
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
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [copiedUrlRowId, setCopiedUrlRowId] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    // Processing queue state
    const [processingQueue, setProcessingQueue] = useState<Array<{ url: string; rowId: string; title: string }>>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const processingRef = useRef(false);

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

    const processVideoWithBackend = async (url: string, rowId: string, title: string) => {
        try {
            // Update status to "Processing..."
            updateRowData(rowId, { status: "Processing..." });
            setProcessingRowId(rowId);

            console.log(`🔄 Starting backend processing for row ${rowId}: ${title}`);

            // Step 1: Upload YouTube video to GCP
            console.log(`📤 Uploading YouTube video to GCP...`);
            const uploadResponse = await uploadYouTubeVideo(url, title);
            const gcpUrl = uploadResponse.gcpUrl;

            if (!gcpUrl) {
                throw new Error("Failed to get GCP URL from upload response");
            }

            console.log(`✅ Video uploaded to GCP: ${gcpUrl}`);

            // Step 2: Process video URL (processes and stores in Supabase)
            console.log(`⚙️ Processing video and storing in Supabase...`);
            const processResponse = await processVideoUrl(gcpUrl, 5, title);

            console.log(`✅ Video processed successfully. Video ID: ${processResponse.id}`);

            // Update status to "Completed"
            // Get current keyTopics from state to preserve it if processResponse doesn't have it
            setRows(currentRows => {
                const currentRow = currentRows.find(r => r.id === rowId);
                return currentRows.map(row => 
                    row.id === rowId ? { 
                        ...row, 
                        status: "Completed",
                        keyTopics: processResponse.keyTopics || row.keyTopics || ""
                    } : row
                );
            });

            setProcessingRowId(null);
            return true;
        } catch (error) {
            console.error(`❌ Error processing video for row ${rowId}:`, error);
            
            // Update status to show error
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            updateRowData(rowId, { 
                status: `Failed: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? '...' : ''}`
            });

            setProcessingRowId(null);
            return false;
        }
    };

    // Process queue sequentially (one video at a time)
    useEffect(() => {
        // Don't start processing if already processing or queue is empty
        if (processingRef.current || processingQueue.length === 0) {
            return;
        }

        const processNextInQueue = async () => {
            processingRef.current = true;
            setIsProcessing(true);
            
            const nextItem = processingQueue[0];
            console.log(`📋 Processing queue item: ${nextItem.title} (${processingQueue.length} items in queue)`);

            try {
                // Process the video
                await processVideoWithBackend(nextItem.url, nextItem.rowId, nextItem.title);
            } catch (error) {
                console.error('Error processing video:', error);
            } finally {
                // Remove processed item from queue - this will trigger the effect again
                setProcessingQueue(prev => prev.slice(1));
                processingRef.current = false;
                setIsProcessing(false);
            }
        };

        processNextInQueue();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processingQueue.length]);

    const fetchVideoData = async (url: string, rowId: string) => {
        if (!url) return;
        
        setIsLoading(true);

        try {
            // Extract video ID from URL
            const videoId = extractVideoId(url);
            
            if (!videoId) {
                throw new Error("Invalid YouTube URL");
            }

            // Check for duplicate video (same video ID already in another row)
            const isDuplicate = rows.some(row => {
                if (row.id === rowId) return false; // Skip the current row
                const existingVideoId = extractVideoId(row.videoUrl);
                return existingVideoId === videoId;
            });

            if (isDuplicate) {
                throw new Error("This video is already in the table");
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
            // Note: YouTube API only reports uploaded/official captions, not auto-generated ones
            const hasCaptions = contentDetails.caption === "true";
            const captionStatus = hasCaptions ? "✓ Captions" : "Auto CC";
            
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

            // Animate and populate the current row with YouTube data (fast)
            await animateDataPopulation(videoInfo, rowId);
            
            console.log(`✅ Row ${rowId} populated`);
            
            // Add to processing queue for backend processing
            setProcessingQueue(prev => [...prev, {
                url: url,
                rowId: rowId,
                title: snippet.title || "Video Title"
            }]);
            console.log(`📋 Added video to processing queue: ${snippet.title}`);
            
            // Enhance with Tavily in background (non-blocking)
            enhanceKeyTopicsWithTavily(snippet.title, snippet.channelTitle, rowId);
            
            // Only fetch suggested videos if:
            // 1. We have less than 5 rows total (AI suggestions allowed)
            // 2. This is the first video being entered
            const shouldFetchSuggestions = rows.length < 5;
            
            if (shouldFetchSuggestions) {
                console.log('🔍 Will fetch related videos (under 5 row limit)');
                // Immediately fetch and populate related videos in parallel
                setTimeout(() => {
                    console.log('⏰ Timeout fired, calling fetchAndPopulateSuggestedVideos');
                    fetchAndPopulateSuggestedVideos(videoId, snippet.title);
                }, 500);
            } else {
                console.log('✋ Skipping suggestions - already at/over 5 rows');
                // Add an empty row for next manual entry if this was the last empty row
                setRows(prev => {
                    const currentRowIndex = prev.findIndex(r => r.id === rowId);
                    const isLastRow = currentRowIndex === prev.length - 1;
                    
                    if (isLastRow) {
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
                        console.log('➕ Added new empty row for manual input');
                        return [...prev, emptyRow];
                    }
                    return prev;
                });
            }

        } catch (error) {
            console.error('Error fetching video data:', error);
            await animateDataPopulation({
                title: "Error - Invalid YouTube URL or API issue",
                duration: "0:00",
                status: "Failed",
                keyTopics: error instanceof Error ? error.message : "Error fetching data.",
            }, rowId);
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
                return; // Don't add anything, not even an empty row
            }

            console.log('🔍 Fetching related videos for:', videoTitle);
            
            // Use Tavily to find similar YouTube videos (finds the URLs)
            // Extract key terms from title for better search
            const searchQuery = `"${videoTitle}" related YouTube videos same topic`;
            
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: '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',
                    query: searchQuery,
                    search_depth: 'advanced',
                    max_results: 15,
                    include_domains: ['youtube.com', 'youtu.be'],
                })
            });

            const tavilyData = await tavilyResponse.json();

            if (!tavilyData.results || tavilyData.results.length === 0) {
                console.log("❌ No related videos found from Tavily");
                return;
            }

            // Extract YouTube URLs and filter out duplicates BY VIDEO ID (not URL)
            // This catches duplicates even with different URL formats (youtube.com vs youtu.be)
            const existingVideoIds = new Set(
                rows.map(row => extractVideoId(row.videoUrl)).filter(Boolean)
            );
            existingVideoIds.add(originalVideoId); // Also exclude the original video
            
            const seenVideoIds = new Set<string>(); // Track IDs within this batch too
            const suggestedUrls = tavilyData.results
                .map((result: any) => result.url)
                .filter((url: string) => {
                    const videoId = extractVideoId(url);
                    if (!videoId) return false;
                    if (!(url.includes('youtube.com/watch') || url.includes('youtu.be/'))) return false;
                    if (existingVideoIds.has(videoId)) return false; // Already in table
                    if (seenVideoIds.has(videoId)) return false; // Already in this batch
                    
                    seenVideoIds.add(videoId); // Mark as seen
                    return true;
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
                const video = batchData.items[i];
                const videoId = video.id;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const snippet = video.snippet;
                const contentDetails = video.contentDetails;
                
                // Parse duration
                const isoDuration = contentDetails.duration;
                const duration = parseISO8601Duration(isoDuration);
                
                // Check if captions are available
                // Note: YouTube API only reports uploaded/official captions, not auto-generated ones
                const hasCaptions = contentDetails.caption === "true";
                const captionStatus = hasCaptions ? "✓ Captions" : "Auto CC";
                
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

                // Generate rowId BEFORE adding so we can track it for animation
                const rowId = `${Date.now()}-${i + 2}-${Math.random()}`;
                
                // Add empty row first
                setRows(prev => {
                    if (prev.length >= 5) {
                        console.log(`🚫 LOOP SAFETY: Already at ${prev.length} rows, stopping at iteration ${i}`);
                        return prev;
                    }
                    
                    const newRow = {
                        id: rowId,
                        videoUrl: videoUrl,
                        title: "",
                        duration: "",
                        status: "",
                        keyTopics: "",
                        height: 40,
                    };
                    
                    console.log(`➕ Adding row with id ${rowId}`);
                    return [...prev, newRow];
                });

                // Wait for row to appear
                await new Promise(resolve => setTimeout(resolve, 300));

                // Animate the row using the known rowId (not stale state!)
                const fields = ['title', 'duration', 'status', 'keyTopics'] as const;
                for (const field of fields) {
                    setAnimatingCells(prev => ({ ...prev, [rowId]: { [field]: true } }));
                    await new Promise(resolve => setTimeout(resolve, 150));
                    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: videoInfo[field] } : r));
                    await new Promise(resolve => setTimeout(resolve, 80));
                    setAnimatingCells(prev => ({ ...prev, [rowId]: {} }));
                }

                console.log(`✅ Completed row: ${videoInfo.title}`);
                enhanceKeyTopicsWithTavily(snippet.title, snippet.channelTitle, rowId);
                
                // CRITICAL FIX: Add suggested video to processing queue
                setProcessingQueue(prev => [...prev, {
                    url: videoUrl,
                    rowId: rowId,
                    title: snippet.title || "Video Title"
                }]);
                console.log(`📋 Added suggested video to processing queue: ${snippet.title}`);
                
                // Small delay before next row
                await new Promise(resolve => setTimeout(resolve, 200));
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

    const animateDataPopulation = async (data: any, rowId: string) => {
        const fields = ['title', 'duration', 'status', 'keyTopics'];
        
        for (const field of fields) {
            setAnimatingCells(prev => ({ ...prev, [rowId]: { [field]: true } }));
            await new Promise(resolve => setTimeout(resolve, 300));
            updateRowData(rowId, { [field]: data[field] });
            await new Promise(resolve => setTimeout(resolve, 100));
            setAnimatingCells(prev => ({ ...prev, [rowId]: {} }));
        }
    };

    const updateRowData = (rowId: string, updates: any) => {
        setRows(prev => prev.map(row => 
            row.id === rowId ? { ...row, ...updates } : row
        ));
    };

    const handleUrlChange = (rowId: string, url: string) => {
        updateRowData(rowId, { videoUrl: url });
    };

    const handleUrlBlur = async (rowId: string, url: string) => {
        // Auto-analyze when user finishes entering URL
        if (url && url.trim() !== '' && !isLoading) {
            await fetchVideoData(url, rowId);
        }
    };

    const handleKeyPress = async (e: React.KeyboardEvent, rowId: string, url: string) => {
        // Also trigger on Enter key
        if (e.key === 'Enter' && url && url.trim() !== '' && !isLoading) {
            await fetchVideoData(url, rowId);
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
                        Developers can&apos;t build apps on video content because there&apos;s no infrastructure to extract what&apos;s inside. Frame fixes this. Send us a URL, get back JSON with transcript, products, topics, and key moments.
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
                                                video url
                                                {/* Column Resize Handle */}
                                                <div
                                                    onMouseDown={(e) => handleColumnMouseDown(e, 'videoUrl')}
                                                    className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-[#737373]/20 transition-colors z-10"
                                                    style={{ borderRight: draggedColumn === 'videoUrl' ? '2px solid #737373' : 'none' }}
                                                />
                                            </TableHead>
                                            <TableHead 
                                                className="h-9 py-2 text-[#737373] text-center relative" 
                                                style={{ width: `${columnWidths.title}%` }}
                                            >
                                                title
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
                                                duration
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
                                captions
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
                                                key topics
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
                                                    <TooltipProvider>
                                                        <Tooltip open={copiedUrlRowId === row.id}>
                                                            <TooltipTrigger asChild>
                                                                <div className="h-full flex items-center justify-center px-2">
                                                                    <input
                                                                        type="text"
                                                                        value={row.videoUrl}
                                                                        onChange={(e) => handleUrlChange(row.id, e.target.value)}
                                                                        onBlur={(e) => handleUrlBlur(row.id, e.target.value)}
                                                                        onKeyPress={(e) => handleKeyPress(e, row.id, row.videoUrl)}
                                                                        onFocus={(e) => e.target.placeholder = ''}
                                                                        onClick={async () => {
                                                                            if (row.videoUrl) {
                                                                                try {
                                                                                    await navigator.clipboard.writeText(row.videoUrl);
                                                                                    setCopiedUrlRowId(row.id);
                                                                                    setTimeout(() => setCopiedUrlRowId(null), 2000);
                                                                                } catch (error) {
                                                                                    console.error('Failed to copy URL:', error);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-full bg-transparent border-none outline-none focus:outline-none text-white font-medium text-center placeholder:text-[#737373] cursor-pointer"
                                                                        placeholder="enter url"
                                                                        disabled={isLoading}
                                                                    />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom">
                                                                <p>copied to clipboard</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
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
                                                            className="h-12 text-white text-center cursor-pointer font-mono text-xs px-0" 
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
                                                            <div className="flex items-center justify-center h-full pt-1">
                                                                {apiKey ? '*'.repeat(apiKey.length) : 'Generating...'}
                                                            </div>
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