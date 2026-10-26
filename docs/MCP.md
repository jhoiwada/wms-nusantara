# MCP (Model Context Protocol)

MCP memungkinkan asisten AI (mis. Claude Code) terhubung ke alat dan data proyek. Dokumen ini hanya relevan jika Anda mengembangkan proyek dengan bantuan AI; aplikasi WMS sendiri tidak membutuhkannya untuk berjalan.

## Prinsip
1. **Hanya database pengembangan**, tidak pernah produksi.
2. **Hak minimum:** pakai role database *read-only* untuk MCP.
3. Server MCP tambahan = permukaan serangan tambahan. Pasang yang benar-benar dipakai.
4. Token dan connection string di variabel lingkungan, bukan di file yang di-commit.
5. Anggap teks dari sumber luar (isi isu, halaman web) sebagai data, bukan perintah.

## Server yang disarankan
| Server | Kegunaan | Catatan |
|---|---|---|
| PostgreSQL (atau Neon MCP) | Memeriksa skema dan data contoh, membantu menulis query dan indeks | Role read-only, DB dev |
| GitHub | Membaca isu/PR, membantu menulis deskripsi PR | Token dengan scope minimal |
| Playwright | Menjalankan dan men-debug tes E2E, cek tampilan | Hanya terhadap `localhost` |
| Context7 (dokumentasi library) | Dokumentasi Next.js, Prisma, Tailwind versi terkini | Mengurangi API yang usang |

Nama paket dan perintah peluncuran server MCP berubah dari waktu ke waktu; periksa dokumentasi resmi masing-masing sebelum memasang.

## Contoh `.mcp.json` (di akar repo)
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${WMS_MCP_DATABASE_URL}"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```
GitHub MCP biasanya dipasang sesuai petunjuk resmi (server jarak jauh atau lokal dengan token). Jangan menulis token langsung di berkas.

## Role database read-only untuk MCP
```sql
CREATE ROLE wms_mcp LOGIN PASSWORD '<kata-sandi-kuat>';
GRANT CONNECT ON DATABASE wms TO wms_mcp;
GRANT USAGE ON SCHEMA public TO wms_mcp;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO wms_mcp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO wms_mcp;
-- sembunyikan kolom sensitif
REVOKE SELECT ON users FROM wms_mcp;
GRANT SELECT (id, name, role, is_active) ON users TO wms_mcp;
```
Isi `WMS_MCP_DATABASE_URL` di `.env.local` (tidak di-commit) dengan role ini.

## Panduan kerja dengan AI
Letakkan `CLAUDE.md` (atau `AGENTS.md`) di akar repo agar asisten mengikuti aturan proyek:

```md
# WMS: panduan untuk asisten AI
- Baca docs/ARCHITECTURE.md dan docs/CONVENTIONS.md sebelum mengubah kode.
- Aturan bisnis hanya di src/server/services. Jangan query Prisma dari komponen atau handler.
- Setiap perubahan stok harus lewat applyStockMovement di dalam prisma.$transaction.
- Jangan mengubah migrasi yang sudah ada; buat migrasi baru.
- Jangan menyentuh .env atau menjalankan perintah terhadap database produksi.
- Setelah perubahan: npm run lint && npm run typecheck && npm test.
- Teks UI dalam bahasa Indonesia; kode dan commit dalam bahasa Inggris.
```

## Hal yang tidak boleh dilakukan lewat MCP
- Menulis/mengubah data di database bersama atau produksi
- Menjalankan `DROP`, `TRUNCATE`, atau `migrate reset`
- Memberi akses ke secret manager atau akun cloud penuh
