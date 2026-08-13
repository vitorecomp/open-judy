'use client';

import React, { useState } from 'react';
import { AtaDraft } from '@/lib/types';
import { FileText, Sparkles, Download, Copy, Check, ShieldCheck, RefreshCw, Send, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AtaEditorProps {
  ata: AtaDraft;
  onRegenerate: () => Promise<void>;
}

export default function AtaEditor({ ata, onRegenerate }: AtaEditorProps) {
  const { user, role, permissions, currentPreset } = useAuth();
  const [content, setContent] = useState<string>(ata.fullFormattedText);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(ata.isApprovedByJudge);
  const [isSubmittedToJudge, setIsSubmittedToJudge] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `termo_audiencia_${ata.hearingId.substring(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateClick = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Action Header */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-crimson" />
          <h2 className="text-sm font-bold text-white">Minuta da Ata de Audiência</h2>
          {isSigned && (
            <span className="flex items-center gap-1 text-[10px] bg-[#1a3328] text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-semibold">
              <ShieldCheck className="w-3 h-3" /> Assinada Digitalmente
            </span>
          )}
          {isSubmittedToJudge && !isSigned && (
            <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-semibold">
              <Send className="w-3 h-3" /> Submetida ao Magistrado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-300 bg-crimson/10 hover:bg-crimson/20 border border-crimson/30 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerar via IA</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-dark-input hover:bg-dark-pill border border-dark-border rounded-xl transition"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-crimson hover:bg-crimson-dark rounded-xl shadow-md shadow-crimson/25 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-crimson transition resize-none"
          placeholder="Texto da Ata de Audiência gerada por IA..."
        />

        {/* Digital Signature & Judicial Workflow Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-dark-input border border-dark-border text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${isSigned ? 'text-emerald-400' : 'text-dark-muted'}`} />
            <span className="text-dark-muted text-[11px] sm:text-xs">
              Titular da Assinatura: <strong className="text-slate-200">{ata.judgeSignature || 'Dra. Camila Vasconcelos de Albuquerque'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canSignMinutes ? (
              // Magistrado or Admin can sign directly
              <button
                onClick={() => setIsSigned(!isSigned)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  isSigned
                    ? 'bg-[#1a3328] text-emerald-300 border border-emerald-800/40 hover:bg-[#204033]'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isSigned ? 'Revogar Assinatura' : 'Aprovar e Assinar Termo'}</span>
              </button>
            ) : (
              // Assessor workflow: Submit draft for Judge review
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-dark-muted italic hidden md:inline">
                  (Assinatura restrita ao Magistrado)
                </span>
                <button
                  onClick={() => setIsSubmittedToJudge(!isSubmittedToJudge)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                    isSubmittedToJudge
                      ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/60'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittedToJudge ? 'Minuta em Análise pelo Juiz' : 'Submeter Minuta ao Magistrado'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
