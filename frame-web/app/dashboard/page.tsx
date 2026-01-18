// app/dashboard/page.tsx
'use client';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from 'next/link';
import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Clock,
  Hash,
  Activity
} from "lucide-react";

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
        <div className="text-white">Loading analysis...</div>
      </main>
    );
  }

  // Prepare chart data
  const clusterDistribution = Object.entries(gapData.analysis.clusters).map(([key, data]) => ({
    name: `Cluster ${key.split('_')[1]}`,
    videos: data.video_count,
    percentage: Math.round(data.percentage * 10) / 10,
  }));

  const durationData = Object.entries(gapData.analysis.clusters)
    .filter(([_, data]) => data.avg_duration > 0)
    .map(([key, data]) => ({
      name: `C${key.split('_')[1]}`,
      duration: Math.round(data.avg_duration * 10) / 10,
    }));

  // Calculate metrics
  const totalVideos = gapData.analysis.total_videos;
  const avgDuration = Object.values(gapData.analysis.clusters)
    .filter(c => c.avg_duration > 0)
    .reduce((sum, c) => sum + c.avg_duration, 0) /
    Object.values(gapData.analysis.clusters).filter(c => c.avg_duration > 0).length;

  const contentGaps = gapData.gaps.underrepresented_patterns.length;
  const overProduced = gapData.gaps.overrepresented_patterns.length;

  return (
    <main className="min-h-screen bg-[#1C1C1C] flex flex-col overflow-auto">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        className="static w-full px-4 py-20"
      >
        <div className="max-w-[1200px] mx-auto flex justify-center gap-2">
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
        className="grow flex justify-center px-4 pt-2 pb-20"
      >
        <div className="max-w-[1200px] w-full space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-[15px] font-normal text-white mb-1">
              Content Gap Analysis
            </h1>
            <p className="text-[#737373] text-[15px]">
              AI-powered insights into your content patterns • Model: {gapData.model_id.slice(0, 8)}...
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader className="pb-3">
                <CardDescription className="text-[#737373] text-[13px] flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Total Videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-normal text-white">
                  {totalVideos}
                </div>
                <p className="text-xs text-[#737373] mt-1">
                  {gapData.analysis.num_clusters} content patterns
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader className="pb-3">
                <CardDescription className="text-[#737373] text-[13px] flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg Duration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-normal text-white">
                  {avgDuration > 1 ? avgDuration.toFixed(1) : '<1'}
                </div>
                <p className="text-xs text-[#737373] mt-1">
                  minutes per video
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader className="pb-3">
                <CardDescription className="text-[#ef4444] text-[13px] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Content Gaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-normal text-[#ef4444]">
                  {contentGaps}
                </div>
                <p className="text-xs text-[#737373] mt-1">
                  underrepresented patterns
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader className="pb-3">
                <CardDescription className="text-[#f59e0b] text-[13px] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Over-Produced
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-normal text-[#f59e0b]">
                  {overProduced}
                </div>
                <p className="text-xs text-[#737373] mt-1">
                  consider diversifying
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Content Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader>
                <CardTitle className="text-[15px] font-normal text-white">
                  Cluster Distribution
                </CardTitle>
                <CardDescription className="text-[#737373] text-[13px]">
                  How your content is distributed across patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clusterDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="videos"
                    >
                      {clusterDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#252525',
                        border: '1px solid #3a3a3a',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[#252525] border-[#3a3a3a]">
              <CardHeader>
                <CardTitle className="text-[15px] font-normal text-white">
                  Average Duration by Cluster
                </CardTitle>
                <CardDescription className="text-[#737373] text-[13px]">
                  Typical video length per content pattern
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis
                      dataKey="name"
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#737373' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#252525',
                        border: '1px solid #3a3a3a',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="duration" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Content Gaps - High Priority */}
          {gapData.gaps.underrepresented_patterns.length > 0 && (
            <Card className="bg-[#252525] border-[#ef4444]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[#ef4444]" />
                  <CardTitle className="text-[15px] font-normal text-white">
                    Content Gaps - High Priority
                  </CardTitle>
                </div>
                <CardDescription className="text-[#737373] text-[13px]">
                  These content patterns are underrepresented in your library
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gapData.gaps.underrepresented_patterns.map((gap, idx) => (
                  <div key={idx} className="p-4 bg-[#1C1C1C] rounded-lg border border-[#3a3a3a]">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="destructive" className="mb-2">
                          Cluster {gap.cluster_id}
                        </Badge>
                        <div className="flex items-center gap-2 text-[#737373] text-sm">
                          <span>{gap.current_count} videos</span>
                          <span>•</span>
                          <span>{gap.percentage.toFixed(1)}%</span>
                          <TrendingDown className="h-4 w-4 text-[#ef4444] ml-2" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#737373]">Avg Duration</div>
                        <div className="text-lg text-white">
                          {gap.pattern.duration > 1
                            ? `${gap.pattern.duration.toFixed(1)} min`
                            : '<1 min'}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-[#737373] mb-1">AI Pattern Analysis:</div>
                      <p className="text-white text-sm leading-relaxed">
                        {gap.ai_description}
                      </p>
                    </div>

                    {gap.pattern.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {gap.pattern.topics.slice(0, 5).map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-[#2B2B2B] border-[#3a3a3a] text-white">
                            {topic.length > 30 ? topic.slice(0, 30) + '...' : topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Over-Represented Content */}
          {gapData.gaps.overrepresented_patterns.length > 0 && (
            <Card className="bg-[#252525] border-[#f59e0b]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#f59e0b]" />
                  <CardTitle className="text-[15px] font-normal text-white">
                    Over-Represented Content
                  </CardTitle>
                </div>
                <CardDescription className="text-[#737373] text-[13px]">
                  Consider diversifying away from these patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gapData.gaps.overrepresented_patterns.map((pattern, idx) => (
                  <div key={idx} className="p-4 bg-[#1C1C1C] rounded-lg border border-[#3a3a3a]">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge className="mb-2 bg-[#f59e0b] text-white">
                          Cluster {pattern.cluster_id}
                        </Badge>
                        <div className="flex items-center gap-2 text-[#737373] text-sm">
                          <span>{pattern.current_count} videos</span>
                          <span>•</span>
                          <span>{pattern.percentage.toFixed(1)}%</span>
                          <TrendingUp className="h-4 w-4 text-[#f59e0b] ml-2" />
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-[#737373] mb-1">Pattern:</div>
                      <p className="text-white text-sm leading-relaxed">
                        {pattern.ai_description.slice(0, 200)}
                        {pattern.ai_description.length > 200 && '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          {gapData.gaps.recommendations && gapData.gaps.recommendations.length > 0 && (
            <Card className="bg-[#252525] border-[#10b981]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-[#10b981]" />
                  <CardTitle className="text-[15px] font-normal text-white">
                    Action Plan - Prioritized Recommendations
                  </CardTitle>
                </div>
                <CardDescription className="text-[#737373] text-[13px]">
                  AI-generated suggestions to balance your content portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gapData.gaps.recommendations
                  .sort((a, b) => b.current_gap - a.current_gap)
                  .map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-[#1C1C1C] rounded-lg border border-[#3a3a3a]"
                    >
                      <div className="shrink-0 w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white font-medium text-sm">
                        {idx + 1}
                      </div>
                      <div className="grow">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-[#2B2B2B] border-[#3a3a3a] text-white">
                            {rec.priority}
                          </Badge>
                          <span className="text-xs text-[#737373]">
                            Gap: {rec.current_gap.toFixed(1)}% below average
                          </span>
                        </div>
                        <p className="text-white text-sm">
                          {rec.action}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* All Clusters Overview */}
          <Card className="bg-[#252525] border-[#3a3a3a]">
            <CardHeader>
              <CardTitle className="text-[15px] font-normal text-white">
                All Content Clusters
              </CardTitle>
              <CardDescription className="text-[#737373] text-[13px]">
                Detailed breakdown of each content pattern
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(gapData.analysis.clusters).map(([key, cluster]) => {
                const clusterId = parseInt(key.split('_')[1]);
                const isGap = gapData.gaps.underrepresented_patterns.some(g => g.cluster_id === clusterId);
                const isOver = gapData.gaps.overrepresented_patterns.some(g => g.cluster_id === clusterId);

                return (
                  <div key={key} className="p-4 bg-[#1C1C1C] rounded-lg border border-[#3a3a3a]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">Cluster {clusterId}</h3>
                        {isGap && (
                          <Badge variant="destructive" className="text-xs">Gap</Badge>
                        )}
                        {isOver && (
                          <Badge className="text-xs bg-[#f59e0b] text-white">Over-Rep</Badge>
                        )}
                        {!isGap && !isOver && (
                          <Badge variant="outline" className="text-xs bg-[#10b981] text-white border-[#10b981]">
                            Balanced
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#737373]">{cluster.video_count} videos</div>
                        <div className="text-lg text-white">{cluster.percentage.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-white leading-relaxed">
                        {cluster.ai_description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <div className="text-[#737373]">Avg Duration</div>
                        <div className="text-white">
                          {cluster.avg_duration > 1
                            ? `${cluster.avg_duration.toFixed(1)} min`
                            : '<1 min'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#737373]">Scene Changes/min</div>
                        <div className="text-white">{cluster.avg_scene_change_rate.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-[#737373]">Avg Topics</div>
                        <div className="text-white">{cluster.avg_topics.toFixed(0)}</div>
                      </div>
                    </div>

                    {cluster.top_topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cluster.top_topics.slice(0, 5).map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-[#2B2B2B] border-[#3a3a3a] text-white">
                            {topic.length > 30 ? topic.slice(0, 30) + '...' : topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  );
}