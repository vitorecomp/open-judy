import React from 'react';
import Link from 'next/link';
import { Scale, Sparkles, Plus, Database, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenUpload?: () => void;
}

export default function Navbar({ onOpenUpload }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">Open Judy</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                IA Judiciária
              </span>
            </div>
            <p className="text-xs text-slate-400">Transcrição & Atas com Gemini + AlloyDB</p>
          </div>
        </Link>

        {/* Center / Stack Badges */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini 2.0 Audio</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>AlloyDB pgvector</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>K8s Quarkus Microservices</span>
          </div>
        </div>
      </div>
    </header>
  );
}
