// app/dashboard/page.tsx
'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';
import * as React from "react";
import {
  PieChart,
  Pie,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

// Types from gap_analysis.json
interface ClusterInfo {
  video_count: number;
  percentage: number;
  avg_duration: number;
  avg_topics: number;
  avg_scene_change_rate: number;
  top_topics: string[];
  video_titles: (string | null)[];
  ai_description: string;
}

interface ClusteredVideo {
  video_id: string;
  title: string | null;
  cluster: number;
  cluster_description: string;
  duration_minutes: number;
  unique_topics: number;
  scene_change_rate: number;
  topics: string;
}

interface GapPattern {
  cluster: string;
  cluster_id: number;
  current_count: number;
  percentage: number;
  ai_description: string;
  pattern: {
    duration: number;
    topics: string[];
    scene_change_rate: number;
  };
}

interface Recommendation {
  cluster_id: number;
  action: string;
  priority: string;
  current_gap: number;
}

interface GapAnalysis {
  model_id: string;
  analysis: {
    total_videos: number;
    num_clusters: number;
    clusters: Record<string, ClusterInfo>;
  };
  gaps: {
    underrepresented_patterns: GapPattern[];
    overrepresented_patterns: GapPattern[];
    balanced_patterns: GapPattern[];
    recommendations: Recommendation[];
  };
  clustered_videos: ClusteredVideo[];
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];

export default function DashboardPage() {
  const [gapData, setGapData] = React.useState<GapAnalysis | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Load gap_analysis.json
    fetch('/api/gap-analysis') // You'll need to create this endpoint
      .then(res => res.json())
      .then(data => {
        setGapData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading gap analysis:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !gapData) {
    return (
      <main className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-[#737373] text-[15px]">loading analysis...</div>
      </main>
    );
  }

  // Prepare chart data
  const clusterDistribution = Object.entries(gapData.analysis.clusters).map(([key, data], index) => {
    const clusterId = key.split('_')[1];
    return {
      cluster: `cluster ${clusterId}`,
      videos: data.video_count,
      percentage: Math.round(data.percentage * 10) / 10,
      fill: COLORS[index % COLORS.length],
    };
  });

  // Calculate metrics
  const totalVideos = gapData.analysis.total_videos;
  const avgDuration = Object.values(gapData.analysis.clusters)
    .filter(c => c.avg_duration > 0)
    .reduce((sum, c) => sum + c.avg_duration, 0) /
    Object.values(gapData.analysis.clusters).filter(c => c.avg_duration > 0).length;

  const contentGaps = gapData.gaps.underrepresented_patterns.length;
  const overProduced = gapData.gaps.overrepresented_patterns.length;

  // Chart configuration for pie chart
  const clusterChartConfig = {
    videos: {
      label: "videos",
    },
  } satisfies ChartConfig;

  return (
    <main className="min-h-screen bg-[#1C1C1C] flex flex-col overflow-auto">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        className="static w-full px-4 py-20"
      >
        <div className="max-w-[660px] mx-auto flex justify-center gap-2">
          <Link href="/">
            <Button variant="ghost" className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]">
              frame
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="ghost" className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]">
              docs
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-[#2B2B2B]">
              dashboard
            </Button>
          </Link>
          <Link href="/waitlist">
            <Button variant="ghost" className="text-[#737373] hover:text-white hover:bg-[#2B2B2B]">
              waitlist
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        className="flex-grow flex justify-center px-4 pt-2 pb-20"
      >
        <div className="max-w-[660px] w-full space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-[15px] font-normal text-white mb-1">
              content gap analysis
            </h1>
            <p className="text-[#737373] text-[15px]">
              {totalVideos} videos analyzed across {gapData.analysis.num_clusters} content patterns. avg {avgDuration > 1 ? avgDuration.toFixed(1) : '<1'} min per video.
            </p>
          </div>

          {/* Distribution Overview */}
          <div>
            <h2 className="text-[15px] font-normal text-white mb-2">
              distribution
            </h2>
            <div className="overflow-hidden rounded-lg border border-[#2B2B2B] bg-[#1C1C1C]">
              <div className="p-6">
                <ChartContainer
                  config={clusterChartConfig}
                  className="mx-auto aspect-square max-h-[200px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-[#2B2B2B] bg-[#1C1C1C] px-3 py-2">
                              <div className="text-[13px] text-white">
                                {data.cluster}: {data.videos} videos
                              </div>
                              <div className="text-[11px] text-[#737373]">
                                {data.percentage}%
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie 
                      data={clusterDistribution} 
                      dataKey="videos" 
                      nameKey="cluster"
                      strokeWidth={0}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
          </div>

          {/* Content Gaps */}
          {gapData.gaps.underrepresented_patterns.length > 0 && (
            <div>
              <h2 className="text-[15px] font-normal text-[#ef4444] mb-2">
                content gaps ({contentGaps})
              </h2>
              <div className="space-y-4 text-[15px] leading-relaxed">
                {gapData.gaps.underrepresented_patterns.map((gap, idx) => (
                  <div key={idx}>
                    <p className="text-white mb-1">
                      <span className="text-[#737373]">cluster {gap.cluster_id}:</span> {gap.ai_description}
                    </p>
                    <div className="text-[#737373] text-[13px]">
                      {gap.current_count} videos • {gap.percentage.toFixed(1)}% • avg {gap.pattern.duration > 1 ? `${gap.pattern.duration.toFixed(1)} min` : '<1 min'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Over-Represented Content */}
          {gapData.gaps.overrepresented_patterns.length > 0 && (
            <div>
              <h2 className="text-[15px] font-normal text-[#f59e0b] mb-2">
                over-represented ({overProduced})
              </h2>
              <div className="space-y-4 text-[15px] leading-relaxed">
                {gapData.gaps.overrepresented_patterns.map((pattern, idx) => (
                  <div key={idx}>
                    <p className="text-white mb-1">
                      <span className="text-[#737373]">cluster {pattern.cluster_id}:</span> {pattern.ai_description.slice(0, 200)}{pattern.ai_description.length > 200 && '...'}
                    </p>
                    <div className="text-[#737373] text-[13px]">
                      {pattern.current_count} videos • {pattern.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {gapData.gaps.recommendations && gapData.gaps.recommendations.length > 0 && (
            <div>
              <h2 className="text-[15px] font-normal text-white mb-2">
                recommendations
              </h2>
              <div className="space-y-3 text-[15px] leading-relaxed">
                {gapData.gaps.recommendations
                  .sort((a, b) => b.current_gap - a.current_gap)
                  .map((rec, idx) => (
                    <p key={idx} className="text-white">
                      <span className="text-[#737373]">{idx + 1}.</span> {rec.action}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* All Clusters */}
          <div>
            <h2 className="text-[15px] font-normal text-white mb-4">
              all clusters
            </h2>
            <div className="space-y-6">
              {Object.entries(gapData.analysis.clusters).map(([key, cluster]) => {
                const clusterId = parseInt(key.split('_')[1]);
                const isGap = gapData.gaps.underrepresented_patterns.some(g => g.cluster_id === clusterId);
                const isOver = gapData.gaps.overrepresented_patterns.some(g => g.cluster_id === clusterId);
                
                const statusColor = isGap ? '#ef4444' : isOver ? '#f59e0b' : '#10b981';
                const statusText = isGap ? 'gap' : isOver ? 'over-rep' : 'balanced';

                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-[15px] font-normal text-white">
                        cluster {clusterId} <span className="text-[#737373]" style={{ color: statusColor }}>({statusText})</span>
                      </h3>
                      <div className="text-[13px] text-[#737373]">
                        {cluster.video_count} videos • {cluster.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-[15px] text-white leading-relaxed mb-2">
                      {cluster.ai_description}
                    </p>
                    <div className="text-[13px] text-[#737373]">
                      {cluster.avg_duration > 1 ? `${cluster.avg_duration.toFixed(1)} min` : '<1 min'} avg • {cluster.avg_scene_change_rate.toFixed(1)} scene changes/min • {cluster.avg_topics.toFixed(0)} topics
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}