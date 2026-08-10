import React from 'react';
import Link from 'next/link';
import { Sparkles, Database, ShieldCheck } from 'lucide-react';
import JudyLogo from './JudyLogo';

interface NavbarProps {
  onOpenUpload?: () => void;
}

export default function Navbar({ onOpenUpload }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="relative h-16 flex items-center group">
          <div className="absolute top-0 left-0 z-10">
            <JudyLogo
              size="md"
              showText={false}
            />
          </div>
          <div className="pl-14 flex items-center">
            <span className="font-bold text-base text-white tracking-tight">Open Judy</span>
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
