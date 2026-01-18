'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';

export default function DocsPage() {
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    duration: 0.8,
                    ease: "easeOut",
                    delay: 0.3
                }}
                className="flex-grow flex justify-center px-4 pt-2"
            >
                <div className="max-w-[660px] w-full">
                    <div className="text-white text-[15px] leading-relaxed space-y-6">
                        <div>
                            <h1 className="text-[15px] font-normal text-white mb-6">
                                Documentation
                            </h1>
                            <p className="text-[#a1a1aa] mb-4">
                                Learn how to integrate Frame into your application.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h2 className="text-white text-[15px] font-normal mb-2">
                                    Getting Started
                                </h2>
                                <p className="text-[#a1a1aa]">
                                    Send a YouTube URL and receive structured JSON data containing transcripts, products, topics, and key moments.
                                </p>
                            </div>

                            <div className="mt-6 p-4 bg-[#252525] rounded-lg border border-[#3a3a3a]">
                                <code className="text-[13px] text-[#a1a1aa] whitespace-pre">
{`POST /api/analyze
{
  "videoUrl": "https://youtube.com/watch?v=..."
}`}
                                </code>
                            </div>

                            <div className="mt-6">
                                <h2 className="text-white text-[15px] font-normal mb-2">
                                    API Reference
                                </h2>
                                <p className="text-[#a1a1aa]">
                                    Full API documentation coming soon.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
