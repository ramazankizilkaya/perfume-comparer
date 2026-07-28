#!/usr/bin/env bash
#
# Aura Compare — geliştirme ortamını tek komutla ayağa kaldırır.
#   Backend  (.NET API)  -> http://localhost:5026
#   Frontend (Next.js)   -> http://localhost:3000
#
# Ctrl+C ya da bu script'ten çıkınca ikisini de (ve alt süreçlerini) kapatır.
# Kullanım:  ./dev.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/src/PerfumeComparer"
WEB_DIR="$ROOT/src/perfume-comparer-web"

cleanup() {
    trap - EXIT INT TERM        # tekrar tetiklenmesin
    echo ""
    echo "⏹  Kapatılıyor (backend + frontend)..."
    kill 0 2>/dev/null || true  # bu script'in tüm süreç grubunu durdur
}
trap cleanup EXIT INT TERM

echo "▶  Backend  başlatılıyor → http://localhost:5026"
( cd "$API_DIR" && exec dotnet run --launch-profile http ) &

echo "▶  Frontend başlatılıyor → http://localhost:3000"
( cd "$WEB_DIR" && exec npm run dev ) &

echo ""
echo "✅ İkisi de çalışıyor. Durdurmak için Ctrl+C."
echo "   (DB boşsa backend ilk açılışta veriyi otomatik basar.)"
echo ""

wait
