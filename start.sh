#!/usr/bin/env bash
#
# Aura Compare — geliştirme ortamını tek komutla ayağa kaldırır.
#   Backend  (.NET API)  -> http://localhost:5026
#   Frontend (Next.js)   -> http://localhost:3000
#
# Açılmadan önce bu portları tutan eski süreçleri kapatır, böylece
# "address already in use" hatası almazsınız.
# Ctrl+C ya da bu script'ten çıkınca ikisini de (ve alt süreçlerini) kapatır.
#
# Kullanım:
#   ./start.sh            yalnızca yerelde başlatır
#   ./start.sh --ngrok    ayrıca ngrok açar ve frontend'i internete yayınlar
#                         (/api ve /media istekleri frontend üzerinden backend'e gider)
#                         Sabit adres için:  NGROK_DOMAIN=adiniz.ngrok-free.dev ./start.sh --ngrok
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/src/PerfumeComparer"
WEB_DIR="$ROOT/src/perfume-comparer-web"

API_PORT=5026
WEB_PORT=3000
NGROK_INSPECT_PORT=4040   # ngrok'un yerel durum arayüzü; yayın adresini buradan okuruz

USE_NGROK=0
for arg in "$@"; do
    case "$arg" in
        --ngrok|-n) USE_NGROK=1 ;;
        -h|--help)
            echo "Kullanım: ./start.sh [--ngrok]"
            exit 0
            ;;
        *)
            echo "❌ Bilinmeyen parametre: ${arg}   (kullanım: ./start.sh [--ngrok])"
            exit 1
            ;;
    esac
done

if [ "$USE_NGROK" = 1 ] && ! command -v ngrok >/dev/null 2>&1; then
    echo "❌ ngrok kurulu değil.  brew install ngrok"
    exit 1
fi

NGROK_LOG=""

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
    echo "⏹  Kapatılıyor..."
    [ -n "$NGROK_LOG" ] && rm -f "$NGROK_LOG"
    kill 0 2>/dev/null || true  # bu script'in tüm süreç grubunu durdur
}
trap cleanup EXIT INT TERM

free_port "$API_PORT" "backend"
free_port "$WEB_PORT" "frontend"
[ "$USE_NGROK" = 1 ] && free_port "$NGROK_INSPECT_PORT" "ngrok"

echo "▶  Backend  başlatılıyor → http://localhost:${API_PORT}"
( cd "$API_DIR" && exec dotnet run --launch-profile http ) &

echo "▶  Frontend başlatılıyor → http://localhost:${WEB_PORT}"
rm -rf "$WEB_DIR/.next"
( cd "$WEB_DIR" && exec env NODE_OPTIONS="--max-old-space-size=4096" npm run dev ) &

if [ "$USE_NGROK" = 1 ]; then
    echo "▶  ngrok başlatılıyor → localhost:${WEB_PORT}"
    NGROK_LOG="$(mktemp -t ngrok-start)"
    NGROK_ARGS=(http "$WEB_PORT" --log=stdout --log-level=warn)
    [ -n "${NGROK_DOMAIN:-}" ] && NGROK_ARGS+=(--url "$NGROK_DOMAIN")
    ( exec ngrok "${NGROK_ARGS[@]}" >"$NGROK_LOG" 2>&1 ) &

    PUBLIC_URL=""
    for _ in $(seq 1 30); do   # en fazla 30 saniye bekle
        PUBLIC_URL="$(curl -s "http://127.0.0.1:${NGROK_INSPECT_PORT}/api/tunnels" 2>/dev/null \
            | python3 -c 'import sys, json; print(json.load(sys.stdin)["tunnels"][0]["public_url"])' 2>/dev/null || true)"
        [ -n "$PUBLIC_URL" ] && break
        sleep 1
    done

    if [ -z "$PUBLIC_URL" ]; then
        echo "❌ ngrok adres vermedi. Kayıt:"
        sed 's/^/   /' "$NGROK_LOG" | tail -n 10
        exit 1
    fi
fi

echo ""
echo "✅ Çalışıyor. Durdurmak için Ctrl+C."
[ "$USE_NGROK" = 1 ] && echo "🌍 Herkese açık adres: ${PUBLIC_URL}"
echo "   (Katalog boşsa:  python3 scripts/import_data.py --reset)"
echo ""

wait
