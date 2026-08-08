'use client';

import React, { useState } from 'react';
import { TranscriptSegment, ParticipantRole } from '@/lib/types';
import { Search, Clock, CheckCircle2, Bookmark, Edit2, Sparkles } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentPlaybackMs: number;
  onSeek: (ms: number) => void;
}

const ROLE_COLORS: Record<ParticipantRole, { bg: string; text: string; border: string }> = {
  MAGISTRADO: { bg: 'bg-[#381c22]', text: 'text-red-400', border: 'border-red-900/40' },
  PROMOTOR: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/40' },
  DEFENSOR_PUBLICO: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-800/40' },
  ADVOGADO_AUTOR: { bg: 'bg-sky-950/40', text: 'text-sky-300', border: 'border-sky-800/40' },
  ADVOGADO_REU: { bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-800/40' },
  AUTOR: { bg: 'bg-[#1a3328]', text: 'text-emerald-300', border: 'border-emerald-800/40' },
  REU: { bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/40' },
  TESTEMUNHA: { bg: 'bg-teal-950/40', text: 'text-teal-300', border: 'border-teal-800/40' },
  PERITO: { bg: 'bg-cyan-950/40', text: 'text-cyan-300', border: 'border-cyan-800/40' },
  ESCRIVAO: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-800' },
  OUTRO: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-800' },
};

export default function TranscriptViewer({
  segments,
  currentPlaybackMs,
  onSeek,
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedSpeakers, setEditedSpeakers] = useState<Record<string, string>>({});

  const filteredSegments = segments.filter((s) => {
    const textMatch = s.text.toLowerCase().includes(searchTerm.toLowerCase());
    const speakerMatch = (editedSpeakers[s.id] || s.speakerName)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return textMatch || speakerMatch;
  });

  const handleSpeakerChange = (id: string, newName: string) => {
    setEditedSpeakers((prev) => ({ ...prev, [id]: newName }));
  };

  return (
    <div className="flex flex-col h-full bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Search */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Transcrição Diarizada</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/10 border border-crimson/20 text-red-400 font-semibold">
              Gemini 2.0
            </span>
          </h2>
          <p className="text-xs text-dark-muted">
            {segments.length} segmentos identificados com precisão temporal
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar falas, nomes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition"
          />
        </div>
      </div>

      {/* Segment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSegments.map((segment) => {
          const isActive =
            currentPlaybackMs >= segment.startTimeMs &&
            currentPlaybackMs <= segment.endTimeMs;

          const roleStyle = ROLE_COLORS[segment.speakerRole] || ROLE_COLORS.OUTRO;
          const currentSpeakerName = editedSpeakers[segment.id] || segment.speakerName;

          return (
            <div
              key={segment.id}
              className={`p-4 rounded-xl border transition-all duration-150 ${
                isActive
                  ? 'bg-crimson/10 border-crimson/50 shadow-lg shadow-crimson/10 translate-x-1'
                  : 'bg-dark-input/60 border-dark-border hover:border-dark-muted/40'
              }`}
            >
              {/* Speaker metadata & Timestamp bar */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Speaker Role Pill */}
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                  >
                    {segment.speakerRole.replace('_', ' ')}
                  </span>

                  {/* Speaker Name (Editable) */}
                  {editingId === segment.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={currentSpeakerName}
                        onChange={(e) => handleSpeakerChange(segment.id, e.target.value)}
                        className="px-2 py-0.5 text-xs bg-dark-bg border border-crimson rounded text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-emerald-400 hover:text-emerald-300 p-0.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group/name">
                      <span className="text-xs font-semibold text-slate-200">
                        {currentSpeakerName}
                      </span>
                      <button
                        onClick={() => setEditingId(segment.id)}
                        className="opacity-0 group-hover/name:opacity-100 text-dark-muted hover:text-white transition p-0.5"
                        title="Editar nome do orador"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {segment.isKeyStatement && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-[#382a1c] px-2 py-0.5 rounded-full border border-amber-800/40 font-medium">
                      <Bookmark className="w-2.5 h-2.5" /> Relevante
                    </span>
                  )}
                </div>

                {/* Clickable Timestamp */}
                <button
                  onClick={() => onSeek(segment.startTimeMs)}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-dark-input hover:bg-dark-pill text-[11px] font-mono font-medium text-slate-300 hover:text-white border border-dark-border transition cursor-pointer"
                  title="Ouvir a partir deste ponto"
                >
                  <Clock className="w-3 h-3 text-crimson" />
                  <span>{segment.startTimeFormatted}</span>
                </button>
              </div>

              {/* Spoken Text */}
              <p
                onClick={() => onSeek(segment.startTimeMs)}
                className={`text-sm leading-relaxed cursor-pointer ${
                  isActive ? 'text-white font-medium' : 'text-slate-300 hover:text-white'
                }`}
              >
                {segment.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
