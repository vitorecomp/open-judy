'use client';

import React from 'react';
import MediaPlayer from './MediaPlayer';
import { MediaType, TranscriptSegment } from '@/lib/types';

interface AudioPlayerProps {
  currentPlaybackMs: number;
  onTimeUpdate: (ms: number) => void;
  seekTargetMs: number | null;
  totalDurationSeconds?: number;
  filename?: string;
  mediaType?: MediaType;
  videoUrl?: string;
  segments?: TranscriptSegment[];
}

export default function AudioPlayer(props: AudioPlayerProps) {
  return <MediaPlayer {...props} />;
}
