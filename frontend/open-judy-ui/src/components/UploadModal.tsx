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
      <div className="bg-dark-card border border-dark-border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-bg/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crimson/10 border border-crimson/30 text-crimson flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Incluir Registro Audiovisual de Audiência</h3>
              <p className="text-xs text-dark-muted">Degravação Sincronizada em Conformidade com a Resolução CNJ nº 105/2010</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-muted hover:text-white hover:bg-dark-pill transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
            title="Fechar modal de inclusão de audiência"
            aria-label="Fechar modal de inclusão de audiência"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Media Type Selector Tabs */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Modalidade do Registro Audiovisual (Res. CNJ nº 105/2010)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('VIDEO')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                  mediaType === 'VIDEO'
                    ? 'bg-crimson/15 border-crimson text-white shadow-sm ring-1 ring-crimson/30'
                    : 'bg-dark-input border-dark-border text-dark-muted hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4 text-crimson" />
                <span>Registro Audiovisual (Vídeo)</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('AUDIO')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                  mediaType === 'AUDIO'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-dark-input border-dark-border text-dark-muted hover:text-slate-200'
                }`}
              >
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Registro Fonográfico (Áudio)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Numeração Única dos Autos (Res. CNJ nº 65/2008)
            </label>
            <input
              type="text"
              required
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3.5 py-2 text-white font-mono focus:outline-none focus:border-crimson transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Órgão Julgador / Vara / Comarca (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 3ª Vara Cível Central — Foro João Mendes Jr."
              value={courtVara}
              onChange={(e) => setCourtVara(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Natureza do Ato Processual (TPU/CNJ)</label>
            <select
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              aria-label="Selecionar natureza da audiência"
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-crimson transition-colors"
            >
              <option value="INSTRUCAO_E_JULGAMENTO">Audiência de Instrução e Julgamento (CPC Art. 358)</option>
              <option value="CONCILIACAO">Audiência de Conciliação e Mediação (CPC Art. 334)</option>
              <option value="CUSTODIA">Audiência de Custódia (Res. CNJ nº 213/2015)</option>
              <option value="UNA">Audiência Una (Rito Trabalhista / Juizado Especial)</option>
              <option value="INTERROGATORIO">Interrogatório Judicial (CPP Art. 185)</option>
            </select>
          </div>

          {/* File Drag and Drop Zone */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {mediaType === 'VIDEO'
                ? 'Arquivo Audiovisual (MP4, WebM, MKV, MOV)'
                : 'Arquivo Fonográfico (MP3, WAV, M4A, OGG, FLAC)'}
            </label>
            <label className="border-2 border-dashed border-dark-border hover:border-crimson/60 rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-dark-bg/40 hover:bg-dark-bg/80 transition-colors">
              {mediaType === 'VIDEO' ? (
                <Video className="w-7 h-7 text-crimson" />
              ) : (
                <Music className="w-7 h-7 text-indigo-400" />
              )}
              <div className="text-center">
                <span className="text-white font-semibold block truncate max-w-xs">
                  {selectedFile ? selectedFile.name : `Selecionar arquivo de ${mediaType === 'VIDEO' ? 'vídeo' : 'áudio'} da sessão`}
                </span>
                <p className="text-[11px] text-dark-muted mt-0.5">
                  ou arraste o registro de mídia da audiência para esta área
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
                <span>Autuando mídia e iniciando degravação fonográfica...</span>
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
              className="px-4 py-2 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 rounded-lg bg-crimson hover:bg-crimson-dark text-white font-bold shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Autuando...' : 'Autuar e Iniciar Degravação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
