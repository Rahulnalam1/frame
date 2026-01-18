'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';

export default function WaitlistPage() {

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
                            className="text-white hover:text-white hover:bg-[#2B2B2B]"
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
                <div className="max-w-[660px] w-full space-y-6">
                    {/* Header outside the card */}
                    <div>
                        <h1 className="text-[15px] font-normal text-white mb-1">
                            <Button 
                                variant="link" 
                                className="text-white hover:text-[#a1a1aa] text-[15px] p-0 h-auto font-normal"
                            >
                                you and 64 other people have joined the waitlist
                            </Button>
                        </h1>
                        <p className="text-[#737373] text-[15px]">
                            get early access to frame. we&apos;ll notify you when we launch.
                        </p>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
