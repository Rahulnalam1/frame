'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';
import { useState } from 'react';

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In production, send email to your backend
        console.log('Waitlist email:', email);
        setSubmitted(true);
        setEmail('');
    };

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
                <div className="max-w-[660px] w-full">
                    <div className="text-white text-[15px] leading-relaxed">
                        <h1 className="text-[15px] font-normal text-white mb-6">
                            Join the Waitlist
                        </h1>
                        <p className="text-[#a1a1aa] mb-8">
                            Get early access to Frame. We&apos;ll notify you when we launch.
                        </p>

                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-[#252525] rounded-lg border border-[#3a3a3a]"
                            >
                                <p className="text-white text-[15px]">
                                    Thanks for joining! We&apos;ll be in touch soon.
                                </p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg text-white text-[15px] placeholder:text-[#737373] focus:outline-none focus:border-[#737373] transition-colors"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-white text-black hover:bg-[#e5e5e5] transition-colors py-3 text-[15px]"
                                >
                                    Join Waitlist
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
