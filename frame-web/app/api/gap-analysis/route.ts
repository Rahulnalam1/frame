import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the gap_analysis.json file from public folder
    const filePath = path.join(process.cwd(), 'public', 'gap_analysis.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    // Transform data to match dashboard expectations
    const transformedData = {
      ...data,
      analysis: {
        ...data.analysis,
        clusters: Object.fromEntries(
          Object.entries(data.analysis.clusters).map(([key, cluster]: [string, any]) => {
            // Get cluster description from clustered_videos
            const clusterId = parseInt(key.replace('cluster_', ''));
            const clusterVideo = data.clustered_videos.find((v: any) => v.cluster === clusterId);
            const aiDescription = clusterVideo?.cluster_description || 
              `Content pattern ${clusterId} with ${cluster.video_count} videos.`;

            return [key, {
              ...cluster,
              ai_description: aiDescription,
            }];
          })
        ),
      },
      gaps: {
        underrepresented_patterns: (data.gaps.underrepresented_patterns || []).map((pattern: any) => ({
          ...pattern,
          cluster_id: parseInt(pattern.cluster.replace('cluster_', '')),
          ai_description: pattern.ai_description || `Underrepresented content pattern.`,
          pattern: {
            ...pattern.pattern,
            scene_change_rate: pattern.pattern.scene_change_rate || 0,
          },
        })),
        overrepresented_patterns: (data.gaps.overrepresented_patterns || []).map((pattern: any) => {
          const clusterId = parseInt(pattern.cluster.replace('cluster_', ''));
          const clusterVideo = data.clustered_videos.find((v: any) => v.cluster === clusterId);
          const aiDescription = clusterVideo?.cluster_description || 
            `Overrepresented content pattern with ${pattern.current_count} videos.`;

          return {
            ...pattern,
            cluster_id: clusterId,
            ai_description: aiDescription,
            pattern: {
              ...pattern.pattern,
              scene_change_rate: pattern.pattern.scene_change_rate || 0,
            },
          };
        }),
        balanced_patterns: [],
        recommendations: (data.gaps.recommendations || []).map((rec: any) => ({
          ...rec,
          cluster_id: typeof rec.cluster_id === 'number' ? rec.cluster_id : 
            parseInt(String(rec.cluster_id || rec.cluster || '0').replace('cluster_', '')),
        })),
      },
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error reading gap analysis:', error);
    return NextResponse.json(
      { error: 'Failed to load gap analysis' },
      { status: 500 }
    );
  }
}
