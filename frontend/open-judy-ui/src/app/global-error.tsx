'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0b0c10] text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-white">Algo deu errado</h2>
          <p className="text-xs text-slate-400">{error?.message || 'Erro inesperado no sistema'}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#e63946] hover:bg-[#d62839] text-white rounded-xl text-xs font-bold transition"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
