'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartConfig = {
  videos: {
    label: "Videos Analyzed:",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
    const [timeRange, setTimeRange] = React.useState("30d");
    const [chartData, setChartData] = React.useState<Array<{ date: string; videos: number }>>([]);
    
    // Generate data only on client side to avoid hydration mismatch
    React.useEffect(() => {
      const data = [];
      const today = new Date();
      
      // Generate last 30 days of data - representing videos analyzed per day
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Generate realistic usage patterns (weekdays higher than weekends)
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseValue = isWeekend ? 3 : 8; // Lower usage on weekends
        const randomVariation = Math.floor(Math.random() * 5);
        
        data.push({
          date: dateStr,
          videos: Math.max(0, baseValue + randomVariation)
        });
      }
      
      setChartData(data);
    }, []);
    
    // Calculate stats from chart data
    const totalVideos = React.useMemo(() => 
      chartData.reduce((sum, item) => sum + item.videos, 0), 
      [chartData]
    );
    const avgPerDay = React.useMemo(() => 
      chartData.length > 0 ? Math.round(totalVideos / chartData.length) : 0,
      [totalVideos, chartData.length]
    );
    const totalContentHours = React.useMemo(() => 
      Math.round((totalVideos * 12.5) / 60),
      [totalVideos]
    );

    const filteredData = React.useMemo(() => {
      let daysToShow = 30;
      if (timeRange === "7d") daysToShow = 7;
      if (timeRange === "14d") daysToShow = 14;
      
      return chartData.slice(-daysToShow);
    }, [timeRange, chartData]);

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
                            className="text-white hover:text-white hover:bg-[#2B2B2B]"
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
                <div className="max-w-[660px] w-full space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-[15px] font-normal text-white mb-1">
                            Dashboard
                        </h1>
                        <p className="text-[#737373] text-[15px]">
                            Your usage overview
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="bg-[#252525] border-[#3a3a3a] text-white">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-[#737373] text-[13px]">
                                    Videos Analyzed
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-normal text-white">
                                    {totalVideos.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#252525] border-[#3a3a3a] text-white">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-[#737373] text-[13px]">
                                    Content Hours
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-3xl font-normal text-white">
                                        {totalContentHours}
                                    </div>
                                    <div className="text-[#737373] text-sm">
                                        hrs
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card className="bg-[#252525] border-[#3a3a3a] text-white">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-[#737373] text-[13px] font-normal">
                                    Video analysis over time
                                </CardTitle>
                            </div>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger
                                    className="w-[160px] bg-[#1C1C1C] border-[#3a3a3a] text-white text-sm"
                                    aria-label="Select a time range"
                                >
                                    <SelectValue placeholder="Last 30 days" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#252525] border-[#3a3a3a] text-white">
                                    <SelectItem value="7d" className="focus:bg-[#2B2B2B] focus:text-white text-sm">
                                        Last 7 days
                                    </SelectItem>
                                    <SelectItem value="14d" className="focus:bg-[#2B2B2B] focus:text-white text-sm">
                                        Last 14 days
                                    </SelectItem>
                                    <SelectItem value="30d" className="focus:bg-[#2B2B2B] focus:text-white text-sm">
                                        Last 30 days
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-6 pb-6">
                            <ChartContainer
                                config={chartConfig}
                                className="aspect-auto h-[300px] w-full"
                            >
                                <AreaChart 
                                    data={filteredData}
                                    margin={{
                                        left: 0,
                                        right: 0,
                                        top: 10,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="fillVideos" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-videos)"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-videos)"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid 
                                        strokeDasharray="3 3" 
                                        vertical={false}
                                        stroke="#3a3a3a"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        minTickGap={32}
                                        stroke="#737373"
                                        tick={{ fill: '#ffffff' }}
                                        style={{ fontSize: '12px' }}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return date.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            });
                                        }}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={
                                            <ChartTooltipContent
                                                className="bg-[#252525] border-[#3a3a3a] text-white"
                                                labelFormatter={(value) => {
                                                    return new Date(value).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    });
                                                }}
                                                indicator="line"
                                            />
                                        }
                                    />
                                    <Area
                                        dataKey="videos"
                                        type="monotone"
                                        fill="url(#fillVideos)"
                                        stroke="var(--color-videos)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </main>
    );
}
