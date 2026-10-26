export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-400">
              W
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white">WMS Core</span>
              <span className="ml-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs text-emerald-400/90">
                v0.1.0-alpha
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/50 bg-emerald-950/50 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Fase 0: Fondasi Aktif
            </span>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 md:py-16">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1 font-mono text-xs text-slate-400">
            <span>Studi Kasus: Distributor Jakarta &amp; Bekasi</span>
          </div>
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-white md:text-5xl">
            Sistem Manajemen Gudang
            <span className="mt-1 block text-2xl font-normal text-slate-400 md:text-3xl">
              Presisi Inventaris, Transaksi Stok Atomik, dan Zero-Negative Invariant.
            </span>
          </h1>
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            Aplikasi web monolit Next.js (App Router) + TypeScript Strict + PostgreSQL untuk
            mencatat dan mengontrol barang masuk (GR), barang keluar (DO), lokasi rak 3D, serta
            audit opname fisik.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 transition-colors hover:border-slate-700">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-400">
              ACID
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Integritas Stok Tanpa Celah</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Semua mutasi melewati satu fungsi inti{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-300">
                applyStockMovement
              </code>{' '}
              dalam transaksi database dengan penguncian{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-300">
                FOR UPDATE
              </code>
              . Stok tidak bisa minus.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 transition-colors hover:border-slate-700">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-bold text-blue-400">
              FEFO
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Batch &amp; Kedaluwarsa</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Pengiriman barang secara otomatis memprioritaskan batch yang paling dekat dengan
              tanggal kedaluwarsa (First Expired, First Out) untuk meminimalkan kerugian stok basi.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 transition-colors hover:border-slate-700">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-sm font-bold text-purple-400">
              3D
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Lokasi Rak Zona-Rak-Level</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Format rak presisi (contoh:{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-300">
                A-01-02
              </code>
              ) untuk dua gudang terpisah (Jakarta &amp; Bekasi) dengan pembekuan lokasi selama
              stock opname.
            </p>
          </div>
        </div>

        {/* System Specs & Architecture Matrix */}
        <div className="mt-12 rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Status Arsitektur Sistem</h2>
              <p className="text-sm text-slate-400">
                Implementasi bertahap mengikuti Roadmap Resmi di docs/ROADMAP.md
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 font-mono text-xs text-slate-400">
                Next.js 16 (App Router) + TS Strict
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 sm:grid-cols-4">
            <div>
              <span className="mb-1 block text-xs font-medium tracking-wider text-slate-500 uppercase">
                Gudang Aktif
              </span>
              <span className="text-base font-semibold text-white">Jakarta &amp; Bekasi</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium tracking-wider text-slate-500 uppercase">
                Multi-Role
              </span>
              <span className="text-base font-semibold text-white">
                Admin, Manager, Staff, Viewer
              </span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium tracking-wider text-slate-500 uppercase">
                Audit Trail
              </span>
              <span className="text-base font-semibold text-white">Append-Only Movement</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium tracking-wider text-slate-500 uppercase">
                Quality Control
              </span>
              <span className="text-base font-semibold text-emerald-400">ESLint + TS + Vitest</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <span>&copy; 2026 WMS: Sistem Manajemen Gudang. Portofolio Proyek.</span>
          <span className="font-mono text-slate-400">Fase 0: T0.1 Selesai</span>
        </div>
      </footer>
    </div>
  );
}
