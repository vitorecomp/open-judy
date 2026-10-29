'use client';

import React, { useState } from 'react';
import { X, Upload, Music, Video, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { MediaType, HearingType } from '@/lib/types';
import { api } from '@/lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hearingId: string) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [caseNumber, setCaseNumber] = useState('0005891-12.2024.8.26.0100');
  const [courtVara, setCourtVara] = useState('');
  const [hearingType, setHearingType] = useState('INSTRUCAO_E_JULGAMENTO');
  const [mediaType, setMediaType] = useState<MediaType>('VIDEO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const lower = file.name.toLowerCase();
    if (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mkv') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.avi') ||
      file.type.startsWith('video/')
    ) {
      setMediaType('VIDEO');
    } else {
      setMediaType('AUDIO');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const filename =
        selectedFile?.name ||
        (mediaType === 'VIDEO' ? 'audiencia_instrucao.mp4' : 'audiencia_gravacao.mp3');

      const createdHearing = await api.createHearing({
        caseNumber: caseNumber.trim(),
        courtJurisdiction: courtVara.trim(),
        hearingType: hearingType as HearingType,
        mediaType,
        mediaFilename: filename,
        audioFilename: filename,
        audioSizeBytes: selectedFile?.size || 48500000,
        status: 'PROCESSING_TRANSCRIPTION',
      });

      await api.enqueueTranscription(
        createdHearing.id,
        createdHearing.caseNumber,
        `s3://open-judy-audio-archive/${filename}`
      );

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 95;
          }
          return prev + 25;
        });
      }, 250);

      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setIsUploading(false);
        onSuccess(createdHearing.id);
      }, 1000);
    } catch (err) {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-bg/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Carregar Gravação de Audiência</h3>
              <p className="text-xs text-dark-muted">Suporte a Áudio e Vídeo com Diarização Gemini Multimodal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
            title="Fechar modal de upload"
            aria-label="Fechar modal de upload de gravação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Media Type Selector Tabs */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Tipo de Gravação da Sessão
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('VIDEO')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors min-h-[36px] ${
                  mediaType === 'VIDEO'
                    ? 'bg-crimson/15 border-crimson text-white shadow-sm ring-1 ring-crimson/30'
                    : 'bg-dark-input border-dark-border text-dark-muted hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4 text-crimson" />
                <span>Gravação em Vídeo</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('AUDIO')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors min-h-[36px] ${
                  mediaType === 'AUDIO'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-dark-input border-dark-border text-dark-muted hover:text-slate-200'
                }`}
              >
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Gravação em Áudio</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Número do Processo (CNJ)
            </label>
            <input
              type="text"
              required
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-crimson transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Vara / Comarca / Jurisdição (Opcional)
            </label>
            <input
              type="text"
              placeholder="Deixe em branco caso não informado"
              value={courtVara}
              onChange={(e) => setCourtVara(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tipo de Audiência</label>
            <select
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              aria-label="Selecionar tipo de audiência"
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-crimson transition-colors"
            >
              <option value="INSTRUCAO_E_JULGAMENTO">Instrução e Julgamento</option>
              <option value="CONCILIACAO">Conciliação e Mediação</option>
              <option value="CUSTODIA">Custódia</option>
              <option value="UNA">Una (Trabalhista/Juizado)</option>
              <option value="INTERROGATORIO">Interrogatório</option>
            </select>
          </div>

          {/* File Drag and Drop Zone */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {mediaType === 'VIDEO'
                ? 'Arquivo de Vídeo (MP4, WebM, MKV, MOV)'
                : 'Arquivo de Áudio (MP3, WAV, M4A, OGG, FLAC)'}
            </label>
            <label className="border-2 border-dashed border-dark-border hover:border-crimson/60 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-dark-bg/40 hover:bg-dark-bg/80 transition-colors">
              {mediaType === 'VIDEO' ? (
                <Video className="w-8 h-8 text-crimson animate-bounce" />
              ) : (
                <Music className="w-8 h-8 text-indigo-400" />
              )}
              <div className="text-center">
                <span className="text-white font-semibold block truncate max-w-xs">
                  {selectedFile ? selectedFile.name : `Clique para selecionar o ${mediaType === 'VIDEO' ? 'vídeo' : 'áudio'}`}
                </span>
                <p className="text-[11px] text-dark-muted mt-0.5">
                  ou arraste a gravação da audiência até aqui
                </p>
              </div>
              <input
                type="file"
                accept="audio/*,video/*,.mp4,.webm,.mkv,.mov,.avi,.mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] text-dark-muted">
                <span>Enviando mídia e processando com Gemini Multimodal...</span>
                <span className="text-crimson font-bold tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-dark-input rounded-full overflow-hidden">
                <div
                  className="h-full bg-crimson transition-[width] duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold shadow-md shadow-crimson/25 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Processando...' : 'Iniciar Transcrição IA'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
