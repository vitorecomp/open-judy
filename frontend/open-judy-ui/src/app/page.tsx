'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Hearing } from '@/lib/types';
import UploadModal from '@/components/UploadModal';
import {
  Settings,
  Plus,
  Play,
  ArrowRight,
  Maximize2,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  HelpCircle,
  Clock,
  Archive,
  ArrowUpDown,
  Filter,
  X,
  Sparkles,
  Layers,
  Scale,
  Users,
  MapPin,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>('urgente');
  const [sortOrder, setSortOrder] = useState<'default' | 'date' | 'status'>('default');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.listHearings().then(setHearings);
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.length === hearings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(hearings.map((h) => h.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Helper for status badge styling
  const getStatusBadge = (index: number) => {
    switch (index % 4) {
      case 0:
        return {
          label: 'urgente',
          bg: 'bg-[#381c22]',
          text: 'text-red-400',
          dot: 'bg-crimson',
          border: 'border-red-900/40',
        };
      case 1:
        return {
          label: 'em análise',
          bg: 'bg-[#382a1c]',
          text: 'text-amber-300',
          dot: 'bg-amber-400',
          border: 'border-amber-900/40',
        };
      case 2:
        return {
          label: 'concluída',
          bg: 'bg-[#1a3328]',
          text: 'text-emerald-300',
          dot: 'bg-emerald-400',
          border: 'border-emerald-900/40',
        };
      default:
        return {
          label: 'suspensa',
          bg: 'bg-[#1c2838]',
          text: 'text-sky-300',
          dot: 'bg-sky-400',
          border: 'border-sky-900/40',
        };
    }
  };

  const getTypeBadge = (type: string) => {
    const formatted = type.replace(/_/g, ' ');
    if (formatted.includes('INSTRUCAO')) return 'Instrução';
    if (formatted.includes('CONCILIACAO')) return 'Conciliação';
    if (formatted.includes('UNA')) return 'Una Trabalhista';
    if (formatted.includes('CUSTODIA')) return 'Custódia';
    if (formatted.includes('INTERROGATORIO')) return 'Interrogatório';
    return 'Geral';
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* ========================================================================= */}
      {/* TOP SECTION: DASHBOARD WIDGETS (Matching Reference Design Top Half) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Big Widget: Court Map Hero (7 cols) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border rounded-2xl p-5 relative flex flex-col justify-between overflow-hidden shadow-xl min-h-[300px] sm:min-h-[340px]">
          {/* Subtle Map Ambient Background */}
          <div className="absolute inset-0 bg-[#121318] opacity-90" />
          
          {/* Stylized vector map graphic & glow */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
            <svg viewBox="0 0 800 400" className="w-full h-full text-slate-600 fill-current">
              {/* World/Regional Map Outline vector simulation */}
              <path d="M150,80 Q200,60 260,90 T350,110 T450,90 T550,120 T650,100 Q700,120 720,160 T680,240 T580,280 T480,260 T380,310 T280,270 T180,220 Z" fill="#252732" />
              <path d="M180,110 Q220,100 280,130 T370,160 T460,140 T560,180 T630,220 T520,240 T390,260 T250,220 T190,160 Z" fill="#1d1e26" />
            </svg>
          </div>

          {/* Interactive Glowing Red Court Pins */}
          <div className="relative z-10 w-full h-full min-h-[220px]">
            {/* Pin 1: TJSP */}
            <div className="absolute top-[38%] left-[48%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-crimson/30 animate-ping absolute inset-0" />
              <div className="w-6 h-6 rounded-full bg-crimson flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-crimson/50 ring-2 ring-white/20">
                24
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-7 left-1/2 -translate-x-1/2 bg-dark-bg border border-dark-border px-2 py-1 rounded-md text-[10px] text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                TJSP • 24 Audiências Ativas
              </div>
            </div>

            {/* Pin 2: TRF3 */}
            <div className="absolute top-[28%] left-[38%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-5 h-5 rounded-full bg-crimson flex items-center justify-center text-[9px] font-bold text-white shadow-md shadow-crimson/40">
                G
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-bg border border-dark-border px-2 py-1 rounded-md text-[10px] text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                TRF3 • 8 Sessões
              </div>
            </div>

            {/* Pin 3: TJDFT */}
            <div className="absolute top-[48%] left-[62%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-5 h-5 rounded-full bg-crimson flex items-center justify-center text-[9px] font-bold text-white shadow-md shadow-crimson/40">
                G
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-bg border border-dark-border px-2 py-1 rounded-md text-[10px] text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                TJDFT • 12 Sessões
              </div>
            </div>

            {/* Pin 4: TRT2 */}
            <div className="absolute top-[58%] left-[42%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-[8px] font-bold text-white shadow-md shadow-crimson/40">
                •
              </div>
            </div>

            {/* Pin 5: TJMG */}
            <div className="absolute top-[22%] left-[68%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-crimson flex items-center justify-center text-[8px] font-bold text-white shadow-md shadow-crimson/40">
                •
              </div>
            </div>
          </div>

          {/* Map bottom controls */}
          <div className="relative z-10 flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                Distribuição Territorial dos Processos & Varas
              </span>
            </div>
            <button
              className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition"
              title="Expandir mapa"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Big Widget: Flights close to completion / Audiências Próximas da Conclusão (5 cols) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Audiências Próximas da Conclusão
              </h3>
              <button className="text-dark-muted hover:text-white transition">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of Flights/Hearings with Progress Bars */}
            <div className="space-y-4">
              {/* Item 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">São Paulo</span>
                    <span className="text-[10px] text-dark-muted">→</span>
                    <span className="font-semibold text-white">TJSP 3ª Vara</span>
                  </div>
                  <span className="text-[11px] text-dark-muted font-mono">06-08-2026 14:00</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-dark-muted">
                  <span className="font-mono text-[10px] text-slate-400">0004521-88.2024</span>
                  <ChevronDown className="w-3 h-3 text-dark-muted cursor-pointer" />
                </div>
                {/* Crimson Progress Bar */}
                <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
                  <div className="h-full bg-crimson rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              {/* Item 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Santo Amaro</span>
                    <span className="text-[10px] text-dark-muted">→</span>
                    <span className="font-semibold text-white">1ª Vara Cível</span>
                  </div>
                  <span className="text-[11px] text-dark-muted font-mono">07-08-2026 10:30</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-dark-muted">
                  <span className="font-mono text-[10px] text-slate-400">0005891-12.2024</span>
                  <ChevronDown className="w-3 h-3 text-dark-muted cursor-pointer" />
                </div>
                <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
                  <div className="h-full bg-crimson rounded-full" style={{ width: '60%' }} />
                </div>
              </div>

              {/* Item 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Barra Funda</span>
                    <span className="text-[10px] text-dark-muted">→</span>
                    <span className="font-semibold text-white">14ª Vara Trab.</span>
                  </div>
                  <span className="text-[11px] text-dark-muted font-mono">07-08-2026 14:15</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-dark-muted">
                  <span className="font-mono text-[10px] text-slate-400">0009142-45.2024</span>
                  <ChevronDown className="w-3 h-3 text-dark-muted cursor-pointer" />
                </div>
                <div className="w-full h-1.5 bg-dark-input rounded-full overflow-hidden">
                  <div className="h-full bg-crimson rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Action button at bottom */}
          <div className="pt-4 border-t border-dark-border/60 flex justify-end">
            <Link
              href="#hearings-table"
              className="px-4 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-semibold text-white transition tracking-wide uppercase text-[11px]"
            >
              IR PARA AUDIÊNCIAS
            </Link>
          </div>
        </div>

        {/* Middle Left Row: Transport Information / Status das Sessões (6 cols) */}
        <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Informações de Audiências & Pautas
              </h3>
              <button className="text-dark-muted hover:text-white transition">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Prominent Stat Columns */}
            <div className="grid grid-cols-3 gap-3 my-2">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  8<span className="text-base sm:text-lg font-normal text-dark-muted">/32</span>
                </div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Audiências na pauta de hoje
                </p>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">1</div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Aguardando revisão do juiz
                </p>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">2</div>
                <p className="text-[11px] text-dark-muted mt-1 leading-tight">
                  Contradições detectadas
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons in card */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-dark-border/60">
            <button
              onClick={() => {}}
              className="px-3.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-semibold text-slate-300 hover:text-white transition uppercase tracking-wider"
            >
              VER MAPA
            </button>
            <Link
              href="/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
              className="px-3.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-semibold text-white transition uppercase tracking-wider"
            >
              ABRIR SESSÃO
            </Link>
          </div>
        </div>

        {/* Middle Right Metric Card 1: Route Efficiency / Eficiência de Transcrição (3 cols) */}
        <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              84<span className="text-xl text-dark-muted">%</span>
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">
              Eficiência na Pauta
            </p>
          </div>

          {/* Smooth curved SVG chart line in red/coral */}
          <div className="my-3 h-16 w-full relative">
            <svg viewBox="0 0 200 80" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e63946" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e63946" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Filled area below curve */}
              <path
                d="M 0,60 C 40,55 70,75 110,40 C 150,10 170,25 200,10 L 200,80 L 0,80 Z"
                fill="url(#curveGradient)"
              />
              {/* Red Stroke line */}
              <path
                d="M 0,60 C 40,55 70,75 110,40 C 150,10 170,25 200,10"
                fill="none"
                stroke="#e63946"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="text-[10px] text-dark-muted">Últimos dados de 2 meses</p>
        </div>

        {/* Middle Right Metric Card 2: Staff briefed / Atas Aprovadas (3 cols) */}
        <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-black text-white tracking-tight">
                72<span className="text-xl text-dark-muted">%</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                Atas Sem Alterações
              </p>
            </div>

            {/* Stylized 3D Red/Coral Donut Chart */}
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-dark-input"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-crimson"
                  strokeDasharray="72, 100"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          <p className="text-[10px] text-dark-muted mt-4">
            Minutas validadas pelo magistrado sem necessidade de edição
          </p>
        </div>

        {/* Bottom Left: Objects that require attention / Casos que Requerem Atenção (7 cols) */}
        <div className="lg:col-span-7 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Processos que requerem atenção
              </h3>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-crimson text-white">
                13
              </span>
            </div>
            <button className="text-dark-muted hover:text-white transition">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] text-dark-muted border-b border-dark-border/60">
                  <th className="pb-2 font-medium">Número do Processo ▾</th>
                  <th className="pb-2 font-medium">Status ▾</th>
                  <th className="pb-2 font-medium">Tipo ▾</th>
                  <th className="pb-2 font-medium">Vara / Juízo ▾</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                <tr className="group hover:bg-dark-pill/30">
                  <td className="py-2.5 font-mono font-medium text-white">
                    <Link
                      href="/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
                      className="hover:text-crimson transition"
                    >
                      0004521-88.2024
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#381c22] text-red-400 border border-red-900/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
                      alta prioridade
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-dark-input text-slate-300 border border-dark-border">
                      Instrução
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-300 text-[11px]">
                    3ª Vara Cível Central
                  </td>
                </tr>
                <tr className="group hover:bg-dark-pill/30">
                  <td className="py-2.5 font-mono font-medium text-white">
                    0015782-33.2024
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#381c22] text-red-400 border border-red-900/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
                      alta prioridade
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-dark-input text-slate-300 border border-dark-border">
                      Interrogatório
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-300 text-[11px]">
                    7ª Vara de Família
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Right: Notifications / Notificações (5 cols) */}
        <div className="lg:col-span-5 bg-dark-card border border-dark-border rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Notificações
                </h3>
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-crimson text-white">
                  3
                </span>
              </div>
              <div className="flex items-center gap-2 text-dark-muted">
                <button className="hover:text-white transition">
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button className="hover:text-white transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Avatar Stack & Update card */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-crimson flex items-center justify-center text-white text-[10px] font-black ring-2 ring-dark-card">
                  J
                </div>
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-dark-card">
                  CV
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-dark-card">
                  AW
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">
                Nova funcionalidade v2.1 integrada!
              </h4>
              <p className="text-[11px] text-dark-muted leading-relaxed">
                Suporte nativo ao modelo Gemini 2.0 Flash com AlloyDB pgvector para detecção de contradições instantânea.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: DATA GRID (Transport / Trucks Style Table) */}
      {/* ========================================================================= */}
      <div id="hearings-table" className="space-y-4 pt-4">
        {/* Table Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Transport / Audiências & Pautas
            </h2>
            <p className="text-xs text-dark-muted">
              Listagem consolidada de sessões judiciais, diarizações e termos
            </p>
          </div>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-card border border-dark-border rounded-2xl p-3 shadow-md">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterStatus && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-input border border-dark-border text-xs text-slate-200">
                <Filter className="w-3 h-3 text-dark-muted" />
                <span>Status: <strong className="text-white">{filterStatus}</strong></span>
                <button
                  onClick={() => setFilterStatus(null)}
                  className="p-0.5 hover:text-crimson text-dark-muted transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => setFilterStatus(filterStatus ? null : 'urgente')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <Plus className="w-3 h-3 text-dark-muted" />
              <span>Adicionar filtro</span>
            </button>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-xs text-slate-300 transition">
              <ArrowUpDown className="w-3 h-3 text-dark-muted" />
              <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
                PADRÃO
              </span>
              <ChevronDown className="w-3 h-3 text-dark-muted" />
            </button>

            {/* Settings button */}
            <button className="p-2 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition">
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Archive Button */}
            <button className="px-3.5 py-1.5 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-[11px] font-bold text-slate-300 hover:text-white uppercase tracking-wider transition">
              ARQUIVO
            </button>

            {/* Add New Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-crimson hover:bg-crimson-dark text-[11px] font-bold text-white uppercase tracking-wider shadow-md shadow-crimson/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NOVA AUDIÊNCIA</span>
            </button>
          </div>
        </div>

        {/* Dark Data Grid Table */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-border bg-dark-bg/50 text-dark-muted text-[11px]">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === hearings.length && hearings.length > 0}
                      onChange={handleSelectAll}
                      className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-300">
                    Número do Processo (CNJ) ▾
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-300">Status ▾</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">Tipo ▾</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">Vara / Juízo ▾</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 text-center">Status IA ▾</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">Partes & Depoentes</th>
                  <th className="py-3 px-4 font-semibold text-slate-300">Magistrado(a)</th>
                  <th className="py-3 px-4 font-semibold text-slate-300 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-dark-border/40">
                {hearings.map((h, idx) => {
                  const badge = getStatusBadge(idx);
                  const isSelected = selectedIds.includes(h.id);

                  return (
                    <tr
                      key={h.id}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-crimson/5 hover:bg-crimson/10'
                          : 'hover:bg-dark-pill/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(h.id)}
                          className="rounded bg-dark-input border-dark-border text-crimson focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Case Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <Link
                          href={`/hearings/${h.id}`}
                          className="hover:text-crimson transition flex items-center gap-2"
                        >
                          <span>{h.caseNumber}</span>
                        </Link>
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-dark-input text-slate-200 border border-dark-border">
                          {getTypeBadge(h.hearingType)}
                        </span>
                      </td>

                      {/* Court Jurisdiction */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium max-w-xs truncate">
                        {h.courtJurisdiction}
                      </td>

                      {/* Status IA Busy/Ready Icon */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-dark-input border border-dark-border text-slate-300">
                          {h.status === 'READY' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-amber-400">?</span>
                          )}
                        </div>
                      </td>

                      {/* Drivers / Participants Avatar Stack */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center text-[9px] font-bold text-slate-200">
                            AW
                          </div>
                          <span className="text-xs text-slate-300 truncate max-w-[120px]">
                            {h.participants[1]?.name || 'Mariana Ribeiro'}
                          </span>
                        </div>
                      </td>

                      {/* Manager / Judge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-[9px] font-bold text-red-300">
                            CV
                          </div>
                          <span className="text-xs text-slate-300">
                            Dra. Camila
                          </span>
                        </div>
                      </td>

                      {/* Actions: Trash, Edit, Open */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-dark-muted">
                          <button
                            onClick={() => {}}
                            className="p-1 rounded hover:text-white transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/hearings/${h.id}`}
                            className="p-1 rounded hover:text-crimson transition"
                            title="Abrir Audiência"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Bulk actions & Pagination */}
          <div className="p-4 bg-dark-bg/60 border-t border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-dark-muted">
            {/* Left: Actions with selected */}
            <div className="flex items-center gap-2">
              <span>Ações com selecionados:</span>
              <button className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-dark-input hover:bg-dark-pill border border-dark-border text-slate-300 text-xs transition">
                <span>Alterar status</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Right: Items per page & Pagination */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Itens por página:</span>
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-input border border-dark-border text-slate-300 text-xs">
                  <span>5</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <span>1-5 de {hearings.length || 5}</span>

              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-40">
                  ‹
                </button>
                <button className="p-1.5 rounded-lg bg-dark-input hover:bg-dark-pill border border-dark-border text-dark-muted hover:text-white transition disabled:opacity-40">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(id) => {
          setIsUploadOpen(false);
          router.push(`/hearings/${id}`);
        }}
      />
    </div>
  );
}
