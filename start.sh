#!/usr/bin/env bash
#
# Aura Compare — geliştirme ortamını tek komutla ayağa kaldırır.
#   Backend  (.NET API)  -> http://localhost:5026
#   Frontend (Next.js)   -> http://localhost:3000
#
# Açılmadan önce bu portları tutan eski süreçleri kapatır, böylece
# "address already in use" hatası almazsınız.
# Ctrl+C ya da bu script'ten çıkınca ikisini de (ve alt süreçlerini) kapatır.
# Kullanım:  ./start.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/src/PerfumeComparer"
WEB_DIR="$ROOT/src/perfume-comparer-web"

API_PORT=5026
WEB_PORT=3000

# Bir portu dinleyen süreçleri kapatır. Önce nazikçe (TERM), inatçıysa zorla (KILL).
free_port() {
    local port="$1" label="$2" pids

    pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
    [ -z "$pids" ] && return 0

    echo "⚠  ${port} portu (${label}) dolu, eski süreç kapatılıyor: $(echo "$pids" | tr '\n' ' ')"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true

    for _ in $(seq 1 20); do   # en fazla 10 saniye bekle
        pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
        [ -z "$pids" ] && return 0
        sleep 0.5
    done

    echo "   Kapanmadı, zorla sonlandırılıyor."
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1

    if lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "❌ ${port} portu hâlâ dolu. Elle bakın:  lsof -i tcp:${port}"
        exit 1
    fi
}

cleanup() {
    trap - EXIT INT TERM        # tekrar tetiklenmesin
    echo ""
    echo "⏹  Kapatılıyor (backend + frontend)..."
    kill 0 2>/dev/null || true  # bu script'in tüm süreç grubunu durdur
}
trap cleanup EXIT INT TERM

free_port "$API_PORT" "backend"
free_port "$WEB_PORT" "frontend"

echo "▶  Backend  başlatılıyor → http://localhost:${API_PORT}"
( cd "$API_DIR" && exec dotnet run --launch-profile http ) &

echo "▶  Frontend başlatılıyor → http://localhost:${WEB_PORT}"
( cd "$WEB_DIR" && exec npm run dev ) &

echo ""
echo "✅ İkisi de çalışıyor. Durdurmak için Ctrl+C."
echo "   (Katalog boşsa:  python3 scripts/import_data.py --reset)"
echo ""

wait
