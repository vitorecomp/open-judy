'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, formatPromptVersionBadge } from '@/lib/api';
import { Case, CaseDocument, DocumentType, Hearing } from '@/lib/types';
import {
  ArrowLeft,
  Layers,
  Scale,
  FileText,
  Search,
  Plus,
  Building2,
  Users,
  Calendar,
  Clock,
  Download,
  Trash2,
  Eye,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
  Bot,
  X,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  FolderArchive
} from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.id as string) || 'f1e2d3c4-b5a6-9788-7654-3210fedcba98';

  const [judicialCase, setJudicialCase] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [caseHearings, setCaseHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [docSearch, setDocSearch] = useState('');
  const [filterDocType, setFilterDocType] = useState<string>('ALL');

  // Upload Document Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('PETICAO_INICIAL');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocPageCount, setNewDocPageCount] = useState<number>(10);
  const [newDocUploader, setNewDocUploader] = useState('Secretaria da Vara');

  // Preview Document Modal State
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);
  const [copiedCaseNumber, setCopiedCaseNumber] = useState(false);

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      const c = await api.getCase(caseId);
      setJudicialCase(c);
      if (c && c.documents) {
        setDocuments(c.documents);
      } else {
        const docs = await api.getCaseDocuments(caseId);
        setDocuments(docs);
      }
      const linkedHearings = await api.getHearingsByCase(c?.caseNumber || caseId);
      setCaseHearings(linkedHearings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCaseNumber = () => {
    if (!judicialCase?.caseNumber) return;
    navigator.clipboard.writeText(judicialCase.caseNumber);
    setCopiedCaseNumber(true);
    setTimeout(() => setCopiedCaseNumber(false), 2000);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle) return;

    const fileName = newDocFileName || `${newDocTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const docData: Partial<CaseDocument> = {
      title: newDocTitle,
      documentType: newDocType,
      fileName,
      fileSize: Math.floor(Math.random() * 4000000) + 500000,
      mimeType: 'application/pdf',
      pageCount: newDocPageCount,
      ocrStatus: 'COMPLETED',
      uploadedBy: newDocUploader,
      extractedText: `Conteúdo textual extraído via OCR para ${newDocTitle}.\nProcesso: ${judicialCase?.caseNumber}\nData da juntada aos autos: ${new Date().toLocaleDateString()}\nAutenticação digital verificada conforme padrão ICP-Brasil.`
    };

    try {
      const created = await api.addCaseDocument(caseId, docData);
      setDocuments((prev) => [created, ...prev]);
      setIsUploadModalOpen(false);
      resetUploadForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Deseja realmente remover esta peça dos autos?')) return;
    try {
      await api.deleteCaseDocument(caseId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  const resetUploadForm = () => {
    setNewDocTitle('');
    setNewDocType('PETICAO_INICIAL');
    setNewDocFileName('');
    setNewDocPageCount(10);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'PETICAO_INICIAL':
        return { label: 'Petição Inicial', bg: 'bg-crimson/15', text: 'text-red-300', border: 'border-crimson/30' };
      case 'CONTESTACAO':
        return { label: 'Contestação', bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/40' };
      case 'LAUDO_TECNICO':
        return { label: 'Laudo Pericial', bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-800/40' };
      case 'ATA_AUDIENCIA':
        return { label: 'Ata de Audiência', bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-800/40' };
      case 'SENTENCA':
        return { label: 'Sentença', bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-800/40' };
      case 'PROCURACAO':
        return { label: 'Procuração', bg: 'bg-sky-950/40', text: 'text-sky-300', border: 'border-sky-800/40' };
      default:
        return { label: 'Documento', bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' };
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.fileName.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.uploadedBy?.toLowerCase().includes(docSearch.toLowerCase());
    const matchesType = filterDocType === 'ALL' || d.documentType === filterDocType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 animate-in fade-in">
      {/* ========================================================================= */}
      {/* Top Card: Case Dossier Details */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/cases"
              className="p-2 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
              title="Voltar para o acervo de processos"
              aria-label="Voltar para a lista de processos"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-dark-muted font-semibold font-serif">Capa dos Autos Digitais • Nº Único CNJ:</span>
              <span className="text-sm font-bold text-white font-mono tabular-nums">{judicialCase?.caseNumber || '0014238-89.2024.8.26.0100'}</span>
              <button
                onClick={handleCopyCaseNumber}
                className="p-1.5 rounded hover:bg-dark-input text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                title="Copiar número único CNJ"
                aria-label="Copiar número do processo"
              >
                {copiedCaseNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-dark-input border border-dark-border text-slate-300">
                Sigilo: Público (Nível 0 — CNJ)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/hearings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-200 transition-colors font-medium min-h-[36px]"
            >
              <Scale className="w-3.5 h-3.5 text-crimson" />
              <span>Termos de Audiência</span>
            </Link>

            <Link
              href="/agents"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-200 transition-colors font-medium min-h-[36px]"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>Assessoria Jurisdicional (Res. CNJ 332)</span>
            </Link>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-colors shadow-sm min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              <span>Juntar Peça aos Autos</span>
            </button>
          </div>
        </div>

        {/* Case Subject & Meta Grid (Distilled Hairlined Strip) */}
        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-dark-muted font-medium block">Classe Processual &amp; Assunto Principal (Tabelas Processuais Unificadas — TPU/CNJ):</span>
            <h1 className="text-base sm:text-lg font-bold text-white leading-snug font-serif mt-0.5">
              {judicialCase?.subject || judicialCase?.caseNumber || 'Ação de Procedimento Comum'}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dark-border/60 border-t border-dark-border/60 pt-3 text-xs">
            <div className="py-2 md:py-0 md:pr-4 space-y-1">
              <span className="text-[11px] text-dark-muted font-semibold">Polo Ativo (Autor / Requerente)</span>
              <div className="font-semibold text-white truncate">{judicialCase?.plaintiffName || '—'}</div>
            </div>

            <div className="py-2 md:py-0 md:px-4 space-y-1">
              <span className="text-[11px] text-dark-muted font-semibold">Polo Passivo (Réu / Requerido)</span>
              <div className="font-semibold text-white truncate">{judicialCase?.defendantName || '—'}</div>
            </div>

            <div className="py-2 md:py-0 md:pl-4 space-y-1">
              <span className="text-[11px] text-dark-muted font-semibold">Órgão Julgador &amp; Magistrado(a)</span>
              <div className="font-semibold text-white truncate">{judicialCase?.courtJurisdiction || '—'}</div>
              {judicialCase?.judgeName && (
                <div className="text-[11px] text-dark-muted truncate">Magistrado(a): {judicialCase.judgeName}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Linked Hearings Card Grid (with Prompt Version Badge) */}
      {/* ========================================================================= */}
      {caseHearings.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between gap-3 border-b border-dark-border pb-3">
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-crimson" />
              <h2 className="text-sm font-bold text-white font-serif">Termos de Audiência e Gravações Vinculadas (Res. CNJ nº 105/2010)</h2>
              <span className="text-xs font-mono text-dark-muted px-2 py-0.5 bg-dark-input rounded-md border border-dark-border tabular-nums">
                {caseHearings.length} {caseHearings.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <Link
              href="/hearings"
              className="text-xs text-crimson hover:underline font-semibold flex items-center gap-1"
            >
              <span>Ver Pauta Completa</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {caseHearings.map((h) => {
              const promptLabel = formatPromptVersionBadge(h.promptVersion, h.pipelineVersion);
              const isCompleted =
                h.status === 'TRANSCRIPTION_COMPLETED' ||
                h.status === 'ANALYSIS_COMPLETED' ||
                h.status === 'READY';
              return (
                <Link
                  key={h.id}
                  href={`/hearings/${h.id}`}
                  className="p-4 rounded-xl bg-dark-input/60 hover:bg-dark-input border border-dark-border hover:border-crimson/50 transition-colors flex flex-col justify-between gap-2.5 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-crimson transition-colors truncate">
                        {h.mediaFilename || h.audioFilename || h.caseNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                          isCompleted
                            ? 'status-badge-success'
                            : 'status-badge-warning'
                        }`}
                      >
                        {isCompleted ? 'concluído' : 'transcrevendo'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-dark-muted truncate tabular-nums">
                      {h.caseNumber}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dark-border/60 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 truncate"
                      title={`Versão do Prompt utilizada na transcrição: ${h.promptVersion || promptLabel}`}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Prompt: {promptLabel}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {h.participants?.length || 0} part.
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Bottom Card: Case Documents Explorer */}
      {/* ========================================================================= */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-5 shadow-sm space-y-4 flex-1 flex flex-col">
        {/* Documents Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-border pb-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-crimson" />
            <h2 className="text-sm font-bold text-white font-serif">Rol de Documentos, Peças e Termos dos Autos</h2>
            <span className="text-xs font-mono text-dark-muted px-2 py-0.5 bg-dark-input rounded-md border border-dark-border tabular-nums">
              {documents.length} peças juntadas
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar nas peças do processo..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-crimson transition-colors shadow-inner min-h-[36px]"
              />
            </div>
          </div>
        </div>

        {/* Category Pills for Documents */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: 'Todas as Peças' },
            { id: 'PETICAO_INICIAL', label: 'Petições Iniciais' },
            { id: 'CONTESTACAO', label: 'Contestações' },
            { id: 'LAUDO_TECNICO', label: 'Laudos Periciais' },
            { id: 'ATA_AUDIENCIA', label: 'Atas de Audiência' },
            { id: 'PROCURACAO', label: 'Procurações' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterDocType(type.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap min-h-[36px] ${
                filterDocType === type.id
                  ? 'bg-crimson text-white border-crimson shadow-sm font-semibold'
                  : 'bg-dark-input border-dark-border text-dark-muted hover:text-white hover:bg-dark-pill'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Documents Table / Grid */}
        <div className="flex-1 overflow-x-auto">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-muted space-y-2">
              <FileText className="w-10 h-10 text-dark-muted mx-auto" />
              <p>Nenhuma peça processual localizada com estes filtros.</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-crimson font-bold hover:underline"
              >
                Clique para anexar a primeira peça aos autos
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-bg/80 border-b border-dark-border text-dark-muted text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tipo da Peça</th>
                  <th className="py-3 px-4 font-semibold">Título & Arquivo</th>
                  <th className="py-3 px-4 text-center font-semibold">Extensão / Páginas</th>
                  <th className="py-3 px-4 font-semibold">Juntada por</th>
                  <th className="py-3 px-4 text-center font-semibold">Status OCR</th>
                  <th className="py-3 px-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredDocs.map((doc) => {
                  const badge = getDocTypeBadge(doc.documentType);
                  return (
                    <tr key={doc.id} className="hover:bg-dark-input/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{doc.title}</span>
                        </div>
                        <div className="text-[11px] text-dark-muted font-mono mt-0.5 tabular-nums">
                          {doc.fileName} • {formatFileSize(doc.fileSize)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                        <span className="px-2 py-0.5 bg-dark-input rounded-md border border-dark-border text-slate-300">
                          {doc.pageCount || 1} pág{doc.pageCount === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{doc.uploadedBy || 'Advocacia'}</div>
                        <div className="text-[11px] text-dark-muted font-mono tabular-nums">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full status-badge-success border text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Indexado</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-2 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                            title="Visualizar Peça e Texto OCR"
                            aria-label={`Visualizar peça ${doc.title}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => alert(`Baixando arquivo ${doc.fileName}...`)}
                            className="p-2 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                            title="Download do PDF"
                            aria-label={`Baixar PDF de ${doc.title}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 rounded-lg bg-dark-input hover:bg-red-950/50 border border-dark-border text-dark-muted hover:text-red-400 transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                            title="Remover Peça"
                            aria-label={`Remover peça ${doc.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Upload Document Modal */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-crimson" />
                <h2 className="text-base font-bold text-white">Anexar Peça aos Autos</h2>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-dark-input text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                aria-label="Fechar modal de juntada de peça"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título da Peça Processual *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Contestação com Requerimento de Perícia"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Documento</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                    aria-label="Selecionar tipo de documento processual"
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-crimson"
                  >
                    <option value="PETICAO_INICIAL">Petição Inicial</option>
                    <option value="CONTESTACAO">Contestação</option>
                    <option value="LAUDO_TECNICO">Laudo Pericial</option>
                    <option value="PROVA_DOCUMENTAL">Prova Documental</option>
                    <option value="PROCURACAO">Procuração / Custas</option>
                    <option value="DESPACHO">Despacho</option>
                    <option value="ATA_AUDIENCIA">Ata de Audiência</option>
                    <option value="SENTENCA">Sentença</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Páginas</label>
                  <input
                    type="number"
                    min={1}
                    value={newDocPageCount}
                    onChange={(e) => setNewDocPageCount(Number(e.target.value))}
                    className="w-full bg-dark-input border border-dark-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-crimson font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Arquivo PDF (Simulação)</label>
                <input
                  type="text"
                  placeholder="ex: laudo_pericial_engenharia.pdf"
                  value={newDocFileName}
                  onChange={(e) => setNewDocFileName(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white placeholder-dark-muted focus:outline-none focus:border-crimson font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Responsável pela Juntada</label>
                <input
                  type="text"
                  value={newDocUploader}
                  onChange={(e) => setNewDocUploader(e.target.value)}
                  className="w-full bg-dark-input border border-dark-border rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-crimson"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-input hover:bg-dark-pill text-dark-muted hover:text-white font-semibold transition-colors min-h-[36px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold transition-colors shadow-md shadow-crimson/20 flex items-center gap-1.5 min-h-[36px]"
                >
                  <Check className="w-4 h-4" />
                  <span>Anexar aos Autos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Preview Document Modal */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-dark-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-dark-input text-red-300 font-mono border border-dark-border">
                    {previewDoc.documentType}
                  </span>
                  <span className="text-[11px] text-dark-muted font-mono tabular-nums">{previewDoc.pageCount || 1} Páginas</span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">{previewDoc.title}</h2>
                <p className="text-xs text-dark-muted font-mono">{previewDoc.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-lg hover:bg-dark-input text-dark-muted hover:text-white transition-colors min-h-[36px] min-w-[36px] touch-target-expand inline-flex items-center justify-center"
                aria-label="Fechar visualização da peça"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-dark-bg border border-dark-border font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {previewDoc.extractedText || `Texto completo extraído via OCR para ${previewDoc.title}.\n\nProcesso: ${judicialCase?.caseNumber}\nJurisdição: ${judicialCase?.courtJurisdiction}\nPartes: ${judicialCase?.plaintiffName} vs ${judicialCase?.defendantName}\n\nTermo assinado digitalmente nos autos eletrônicos.`}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dark-border text-xs">
              <span className="text-dark-muted">
                Juntado por <strong>{previewDoc.uploadedBy}</strong> em {new Date(previewDoc.uploadedAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold transition"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
