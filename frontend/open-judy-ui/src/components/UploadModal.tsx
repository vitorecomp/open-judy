'use client';

import React, { useState } from 'react';
import { X, Upload, Music, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hearingId: string) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [caseNumber, setCaseNumber] = useState('0005891-12.2024.8.26.0100');
  const [courtVara, setCourtVara] = useState('1ª Vara Cível de Santo Amaro/SP');
  const [hearingType, setHearingType] = useState('INSTRUCAO_E_JULGAMENTO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 95;
          }
          return prev + 25;
        });
      }, 300);

      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setIsUploading(false);
        onSuccess('f1e2d3c4-b5a6-9788-7654-3210fedcba98');
      }, 1500);
    } catch (err) {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-bg/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Carregar Gravação de Audiência</h3>
              <p className="text-xs text-dark-muted">Processamento multimodal e diarização Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-dark-muted hover:text-white hover:bg-dark-pill transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Número do Processo (CNJ)
            </label>
            <input
              type="text"
              required
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-crimson transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Vara / Comarca / Jurisdição
            </label>
            <input
              type="text"
              required
              value={courtVara}
              onChange={(e) => setCourtVara(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-crimson transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tipo de Audiência</label>
            <select
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-crimson transition"
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
              Arquivo de Áudio ou Vídeo (MP3, WAV, M4A, MP4, WebM)
            </label>
            <label className="border-2 border-dashed border-dark-border hover:border-crimson/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-dark-bg/40 hover:bg-dark-bg/80 transition">
              <Music className="w-8 h-8 text-crimson" />
              <div className="text-center">
                <span className="text-white font-semibold">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar o áudio'}
                </span>
                <p className="text-[11px] text-dark-muted">ou arraste a gravação da audiência até aqui</p>
              </div>
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] text-dark-muted">
                <span>Enviando para AlloyDB / MinIO e enfileirando no Kafka...</span>
                <span className="text-crimson font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-dark-input rounded-full overflow-hidden">
                <div
                  className="h-full bg-crimson transition-all duration-300 rounded-full"
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
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold shadow-md shadow-crimson/25 disabled:opacity-50 transition"
            >
              {isUploading ? 'Processando...' : 'Iniciar Transcrição IA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
