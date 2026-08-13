import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-crimson/10 border border-crimson/30 flex items-center justify-center text-crimson mb-2">
        <Scale className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">Página não encontrada</h2>
      <p className="text-xs text-dark-muted max-w-sm">
        O processo ou recurso judicial solicitado não foi localizado no sistema Open Judy.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-xs font-bold text-white shadow-md shadow-crimson/25 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retornar ao Dashboard</span>
      </Link>
    </div>
  );
}
