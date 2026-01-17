'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextScramble } from '@/components/ui/text-scramble';
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
    const [animatingCells, setAnimatingCells] = useState<Record<string, boolean>>({});
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
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`;
            
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
            
            // Parse ISO 8601 duration (e.g., PT15M33S, PT1H2M10S)
            const isoDuration = contentDetails.duration;
            const duration = parseISO8601Duration(isoDuration);
            
            // Use Tavily to get intelligent analysis and validation
            // Search for the video to get additional context and verify information
            const tavilySearchResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: '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',
                    query: `YouTube video "${snippet.title}" by ${snippet.channelTitle} - what are the main topics and key takeaways?`,
                    search_depth: 'advanced',
                    max_results: 5,
                    include_answer: true,
                })
            });

            const tavilyData = await tavilySearchResponse.json();
            
            // Combine YouTube description with Tavily's intelligent analysis
            let keyTopics = '';
            
            if (tavilyData.answer) {
                // Tavily's AI-generated answer provides the best summary
                keyTopics = tavilyData.answer
                    .replace(/\\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 250);
                
                // Ensure it ends with proper punctuation
                if (!keyTopics.endsWith('.') && !keyTopics.endsWith('!') && !keyTopics.endsWith('?')) {
                    keyTopics += '.';
                }
            } else if (snippet.description) {
                // Fallback to YouTube description if Tavily doesn't provide answer
                keyTopics = snippet.description
                    .split('\n')[0] // Take first line/paragraph
                    .substring(0, 200)
                    .trim();
                
                if (!keyTopics.endsWith('.') && !keyTopics.endsWith('!') && !keyTopics.endsWith('?')) {
                    keyTopics += '.';
                }
            } else {
                // Last resort fallback
                keyTopics = `Video by ${snippet.channelTitle} covering topics related to ${snippet.title.substring(0, 50)}.`;
            }

            const videoInfo = {
                title: snippet.title || "Video Title",
                duration: duration,
                status: "Completed",
                keyTopics: keyTopics,
            };

            // Animate each cell from left to right
            await animateDataPopulation(videoInfo);
            
            // Auto-fetch suggested videos and populate the next empty row
            setTimeout(async () => {
                await fetchAndPopulateSuggestedVideos(snippet.title, snippet.channelTitle);
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

    const fetchAndPopulateSuggestedVideos = async (videoTitle: string, channelName: string) => {
        try {
            // Only auto-suggest for the first 5 rows
            if (rows.length >= 5) {
                console.log("Reached 5 videos - no more auto-suggestions, but users can still add rows manually");
                // Still add a blank row for manual input, just no suggestion
                const nextRowId = `${Date.now()}-${rows.length + 1}`;
                const blankRow = {
                    id: nextRowId,
                    videoUrl: "",
                    title: "",
                    duration: "",
                    status: "",
                    keyTopics: "",
                    height: 40,
                };
                setRows(prev => [...prev, blankRow]);
                return;
            }

            // Use Tavily to find DIFFERENT related YouTube videos (only for first 5)
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: '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',
                    query: `Find other YouTube videos about similar topics to "${videoTitle}" but NOT from ${channelName}. Show me different creators covering the same subject.`,
                    search_depth: 'advanced',
                    max_results: 10,
                    include_domains: ['youtube.com', 'youtu.be'],
                })
            });

            const tavilyData = await tavilyResponse.json();

            if (!tavilyData.results || tavilyData.results.length === 0) {
                console.log("No suggested videos found - adding blank row");
                // Add blank row if no suggestions found
                const nextRowId = `${Date.now()}-${rows.length + 1}`;
                const blankRow = {
                    id: nextRowId,
                    videoUrl: "",
                    title: "",
                    duration: "",
                    status: "",
                    keyTopics: "",
                    height: 40,
                };
                setRows(prev => [...prev, blankRow]);
                return;
            }

            // Extract YouTube URLs and filter out duplicates
            const existingUrls = rows.map(row => row.videoUrl);
            const suggestedUrls = tavilyData.results
                .map((result: any) => result.url)
                .filter((url: string) => 
                    (url.includes('youtube.com/watch') || url.includes('youtu.be/')) &&
                    !existingUrls.includes(url) // Don't add duplicates
                )
                .slice(0, 1); // Get just 1 suggestion for the next row

            if (suggestedUrls.length > 0) {
                // Generate unique ID using timestamp to avoid duplicates
                const nextRowId = `${Date.now()}-${rows.length + 1}`;
                const newRow = {
                    id: nextRowId,
                    videoUrl: suggestedUrls[0],
                    title: "",
                    duration: "",
                    status: "",
                    keyTopics: "",
                    height: 40,
                };
                
                setRows(prev => [...prev, newRow]);
            } else {
                // No valid suggestions, add blank row
                const nextRowId = `${Date.now()}-${rows.length + 1}`;
                const blankRow = {
                    id: nextRowId,
                    videoUrl: "",
                    title: "",
                    duration: "",
                    status: "",
                    keyTopics: "",
                    height: 40,
                };
                setRows(prev => [...prev, blankRow]);
            }

        } catch (error) {
            console.error('Error fetching suggested videos:', error);
            // On error, still add a blank row so users can continue
            const nextRowId = `${Date.now()}-${rows.length + 1}`;
            const blankRow = {
                id: nextRowId,
                videoUrl: "",
                title: "",
                duration: "",
                status: "",
                keyTopics: "",
                height: 40,
            };
            setRows(prev => [...prev, blankRow]);
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
            setAnimatingCells({ [field]: true });
            await new Promise(resolve => setTimeout(resolve, 300));
            updateRowData(currentRowId, { [field]: data[field] });
            await new Promise(resolve => setTimeout(resolve, 100));
            setAnimatingCells({});
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

    const container = {
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

    const item = {
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

    const handleAboutClick = () => {
        setKey(prev => prev + 1);
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
                    <Button 
                        variant="ghost" 
                        className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        onClick={handleAboutClick}
                    >
                        frame.
                    </Button>
                    <Link href="/write">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            Writing
                        </Button>
                    </Link>
                    <Link href="/playground">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            Playground
                        </Button>
                    </Link>
                    <Link href="https://rahulsagent.vercel.app/">
                        <Button 
                            variant="ghost" 
                            className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]"
                        >
                            Photos
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
                                                Status
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
                                                className="relative [&>td:not(:last-child)]:border-r [&>td:not(:last-child)]:border-[#2B2B2B]"
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
                                                    className={`text-[#a1a1aa] transition-all duration-300 align-middle relative ${
                                                        animatingCells.title && row.id === currentRowId ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.title}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-start pr-2 overflow-x-auto overflow-y-hidden">
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
                                                        animatingCells.duration && row.id === currentRowId ? 'opacity-0' : 'opacity-100'
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
                                                        animatingCells.status && row.id === currentRowId ? 'opacity-0' : 'opacity-100'
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
                                                        animatingCells.keyTopics && row.id === currentRowId ? 'opacity-0' : 'opacity-100'
                                                    }`}
                                                    style={{ height: `${row.height}px`, width: `${columnWidths.keyTopics}%` }}
                                                >
                                                    <div className="h-full flex items-center justify-start pr-2 overflow-x-auto overflow-y-hidden">
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
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </main>
    );
}