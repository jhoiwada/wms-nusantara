export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
              W
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white">WMS Core</span>
              <span className="ml-2 text-xs font-mono text-emerald-400/90 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                v0.1.0-alpha
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Fase 0: Fondasi Aktif
            </span>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md">
            <span>Studi Kasus: Distributor Jakarta &amp; Bekasi</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Sistem Manajemen Gudang
            <span className="block text-slate-400 font-normal text-2xl md:text-3xl mt-1">
              Presisi Inventaris, Transaksi Stok Atomik, dan Zero-Negative Invariant.
            </span>
          </h1>
          <p className="text-slate-400 leading-relaxed text-base md:text-lg">
            Aplikasi web monolit Next.js (App Router) + TypeScript Strict + PostgreSQL untuk mencatat dan
            mengontrol barang masuk (GR), barang keluar (DO), lokasi rak 3D, serta audit opname fisik.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Card 1 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
              ACID
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Integritas Stok Tanpa Celah</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Semua mutasi melewati satu fungsi inti <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-300">applyStockMovement</code> dalam transaksi database dengan penguncian <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-300">FOR UPDATE</code>. Stok tidak bisa minus.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm mb-4">
              FEFO
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Batch &amp; Kedaluwarsa</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pengiriman barang secara otomatis memprioritaskan batch yang paling dekat dengan tanggal kedaluwarsa (First Expired, First Out) untuk meminimalkan kerugian stok basi.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm mb-4">
              3D
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Lokasi Rak Zona-Rak-Level</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Format rak presisi (contoh: <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-300">A-01-02</code>) untuk dua gudang terpisah (Jakarta &amp; Bekasi) dengan pembekuan lokasi selama stock opname.
            </p>
          </div>
        </div>

        {/* System Specs & Architecture Matrix */}
        <div className="mt-12 rounded-xl bg-slate-900/40 border border-slate-800/80 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Status Arsitektur Sistem</h2>
              <p className="text-sm text-slate-400">Implementasi bertahap mengikuti Roadmap Resmi di docs/ROADMAP.md</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
                Next.js 16 (App Router) + TS Strict
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
            <div>
              <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider mb-1">Gudang Aktif</span>
              <span className="text-base font-semibold text-white">Jakarta &amp; Bekasi</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider mb-1">Multi-Role</span>
              <span className="text-base font-semibold text-white">Admin, Manager, Staff, Viewer</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider mb-1">Audit Trail</span>
              <span className="text-base font-semibold text-white">Append-Only Movement</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider mb-1">Quality Control</span>
              <span className="text-base font-semibold text-emerald-400">ESLint + TS + Vitest</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 WMS: Sistem Manajemen Gudang. Portofolio Proyek.</span>
          <span className="font-mono text-slate-400">Fase 0: T0.1 Selesai</span>
        </div>
      </footer>
    </div>
  );
}
