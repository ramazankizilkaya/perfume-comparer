"""
Fragrantica TR üzerindeki markaların parfümlerini ve detay verilerini (notalar, oylar, görseller vb.) çeker.

Kullanım:
    - Parametresiz çalıştırıldığında `scrape_files/brands/` altındaki TÜM markaları sırayla çeker:
        python scripts/scrape_perfumes.py
    
    - Tek bir marka çekmek için:
        python scripts/scrape_perfumes.py afnan
    
    - Belirli bir markadan sınırlı sayıda parfüm çekmek için (örn: afnan markasından 10 parfüm):
        python scripts/scrape_perfumes.py afnan 10

HTTP 400/403/429 (IP kısıtlaması) alındığında script iki kademeli olarak kendi IP'sini değiştirir:
    1) NordVPN uygulamasını `nordvpn://connect` ile yeni bir sunucuya bağlar.
    2) Bu yetmezse Nord'un SOCKS5 uçlarına geçer (başka ülkeler, sistem VPN'ine dokunmadan).

İlgili ortam değişkenleri:
    SCRAPER_VPN_ROTATE=0        -> VPN rotasyonunu tamamen kapatır
    SCRAPER_VPN_MAX_ATTEMPTS=2  -> SOCKS5'e geçmeden önceki VPN rotasyon denemesi sayısı
    NORD_SERVICE_USER / NORD_SERVICE_PASS
        -> SOCKS5 kademesi için gerekli. Bunlar hesap şifren DEĞİL; Nord panelinden alınır:
           nordaccount.com -> NordVPN -> Manual setup -> Service credentials
        -> Tanımlı değilse 2. kademe atlanır, script kademeli soğuma ile devam eder.
"""

import sys
import os
import json
import time
import random
import re
import io
import ssl
import urllib.request
from PIL import Image
from playwright.sync_api import sync_playwright

class IPBlockedException(Exception):
    pass

def parse_perfume_page(page, perfume_url):
    print(f"Navigating to {perfume_url}...")
    try:
        response = page.goto(perfume_url, wait_until="domcontentloaded", timeout=20000)
        if not response:
            return None, "Sayfa yanıtı alınamadı (No response)"
        if response.status != 200:
            return None, f"HTTP Status {response.status}"
    except Exception as e:
        return None, f"Navigasyon hatası: {e}"

    try:
        page.wait_for_timeout(2500)

        # Scroll down step-by-step to trigger lazy loading of accords, votes, pyramid, reminds section
        for i in range(1, 12):
            page.evaluate(f"window.scrollTo(0, {i} * document.body.scrollHeight / 12)")
            page.wait_for_timeout(300)

        data = page.evaluate(r"""() => {
        const bodyText = document.body.innerText;

        // 1. Name & Target (For who)
        const h1El = document.querySelector('#toptop h1[itemprop="name"]') || document.querySelector('h1[itemprop="name"]') || document.querySelector('h1');
        let perfumeName = '';
        let targetGender = '';

        if (h1El) {
            const spanEl = h1El.querySelector('span');
            if (spanEl) {
                targetGender = spanEl.innerText.trim();
                const clone = h1El.cloneNode(true);
                const cloneSpan = clone.querySelector('span');
                if (cloneSpan) cloneSpan.remove();
                perfumeName = clone.innerText.trim();
            } else {
                perfumeName = h1El.innerText.trim();
                for (let target of ['kadınlar ve erkekler için', 'kadınlar için', 'erkekler için', 'unisex']) {
                    if (perfumeName.includes(target)) {
                        targetGender = target;
                        perfumeName = perfumeName.replace(target, '').trim();
                        break;
                    }
                }
            }
        }

        // 2. Image
        const imgEl = document.querySelector('img[src*="/perfume/"]') || document.querySelector('img[src*="mdimg/perfume"]') || document.querySelector('img[itemprop="image"]');
        const image = imgEl ? imgEl.src : '';

        // 3. Main Accords (Ana akortlar)
        let accordsContainer = Array.from(document.querySelectorAll('div')).find(d => {
            const text = d.innerText ? d.innerText.trim().toLowerCase() : '';
            return text === 'ana akortlar' || text.startsWith('ana akortlar\n');
        })?.parentElement;

        if (!accordsContainer) {
            accordsContainer = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('ana akortlar'));
        }

        let accordEls = [];
        if (accordsContainer) {
            accordEls = Array.from(accordsContainer.querySelectorAll('div[style*="width"]'));
        }
        if (accordEls.length === 0) {
            accordEls = Array.from(document.querySelectorAll('div.accord-bar, div[class*="accord-bar"], div[style*="width"]'));
        }

        const mainAccords = [];
        const seenAccords = new Set();

        for (let el of accordEls) {
            const name = el.innerText ? el.innerText.trim() : '';
            let width = el.style ? el.style.width : '';
            if (!width) {
                const styleAttr = el.getAttribute('style') || '';
                const match = styleAttr.match(/width:\s*([\d\.]+%)/i);
                if (match) width = match[1];
            }
            if (name && !name.includes('\n') && name.toLowerCase() !== 'ana akortlar' && !seenAccords.has(name)) {
                seenAccords.add(name);
                mainAccords.push({
                    name: name,
                    width: width || ''
                });
            }
        }

        // 4. Rating & Vote Count (Puan & Oy)
        const ratingValue = document.querySelector('[itemprop="ratingValue"]')?.innerText.trim() || '';
        const ratingCount = document.querySelector('[itemprop="ratingCount"]')?.innerText.trim() || '';
        
        let scoreStr = ratingValue;
        let votesStr = ratingCount;

        if (!scoreStr) {
            const ratingMatch = bodyText.match(/Parfüm puanı\s*([\d\.\,]+)\s*üzerinden\s*5\s*ile\s*([\d\.\,]+)\s*oy/i);
            if (ratingMatch) {
                scoreStr = ratingMatch[1];
                votesStr = ratingMatch[2];
            }
        }

        // 5. User Feedback Ratings
        const getVoteValue = (label) => {
            const lines = bodyText.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().toLowerCase() === label.toLowerCase()) {
                    if (lines[i+1] && !isNaN(parseFloat(lines[i+1].replace('k', '')))) {
                        return lines[i+1].trim();
                    }
                }
            }
            return '';
        };

        const ratingBreakdown = {
            love: getVoteValue('bayıldım'),
            like: getVoteValue('beğendim'),
            ok: getVoteValue('normal'),
            dislike: getVoteValue('beğenmedim'),
            hate: getVoteValue('nefret')
        };

        // 6. Season & Time of Day
        const seasonBreakdown = {
            winter: getVoteValue('kış'),
            spring: getVoteValue('ilkbahar'),
            summer: getVoteValue('yaz'),
            autumn: getVoteValue('sonbahar'),
            day: getVoteValue('gündüz'),
            night: getVoteValue('gece')
        };

        // 7. Description
        const descEl = document.querySelector('div[itemprop="description"]') || 
                       Array.from(document.querySelectorAll('div p')).find(p => p.innerText.includes('markasının') || p.innerText.includes('parfümü'));
        const description = descEl ? descEl.innerText.trim() : '';

        // 8. Notes Pyramid (Üst, Orta, Alt)
        const parseNotesSection = (sectionName) => {
            const headers = Array.from(document.querySelectorAll('h4, h3, b, div')).filter(el => el.innerText.trim() === sectionName);
            if (headers.length > 0) {
                const parent = headers[0].parentElement;
                if (parent) {
                    const noteEls = Array.from(parent.querySelectorAll('div, span, a'))
                        .map(e => e.innerText.trim())
                        .filter(t => t.length > 1 && t !== sectionName && !t.includes('\n'));
                    return Array.from(new Set(noteEls)).slice(0, 15);
                }
            }
            return [];
        };

        const extractNotesFromText = (marker) => {
            if (!description) return [];
            const regex = new RegExp(marker + ':\\s*([^;\\.]+)', 'i');
            const match = description.match(regex);
            if (match) {
                return match[1].split(',').map(s => s.replace(' ve ', ',').trim()).filter(Boolean);
            }
            return [];
        };

        // Fragrantica her iki durumda da aynı bileşeni kullanıyor:
        //   3 konteyner -> üst/orta/alt piramidi
        //   1 konteyner -> markanın piramit yayınlamadığı parfümler; tek düz liste (allNotes)
        const noteContainers = Array.from(document.querySelectorAll('.pyramid-level-container'));
        const readContainer = (c) => Array.from(c.querySelectorAll('a.pyramid-note-link .pyramid-note-label'))
            .map(s => s.innerText.trim())
            .filter(Boolean);

        let topNotes = [], middleNotes = [], baseNotes = [], allNotes = [];

        if (noteContainers.length >= 3) {
            topNotes = readContainer(noteContainers[0]);
            middleNotes = readContainer(noteContainers[1]);
            baseNotes = readContainer(noteContainers[2]);
        } else if (noteContainers.length > 0) {
            // 1 (veya 2) konteyner: piramide bölmek tahmin olurdu, hepsini düz listede topla
            allNotes = noteContainers.flatMap(readContainer);
        }

        // DOM'dan hiçbir şey çıkmazsa eski metin tabanlı ayrıştırmaya düş
        if (!topNotes.length && !middleNotes.length && !baseNotes.length && !allNotes.length) {
            topNotes = parseNotesSection('ÜST NOTALAR').length > 0 ? parseNotesSection('ÜST NOTALAR') : extractNotesFromText('Üst notalar');
            middleNotes = parseNotesSection('ORTA NOTALAR').length > 0 ? parseNotesSection('ORTA NOTALAR') : extractNotesFromText('orta notalar');
            baseNotes = parseNotesSection('ALT NOTALAR').length > 0 ? parseNotesSection('ALT NOTALAR') : extractNotesFromText('alt notalar');
        }

        // 9. Longevity (Kalıcılık)
        const longevityBreakdown = {
            veryWeak: getVoteValue('çok zayıf'),
            weak: getVoteValue('zayıf'),
            moderate: getVoteValue('orta'),
            longLasting: getVoteValue('uzun süre kalıcı'),
            eternal: getVoteValue('kalıcı') || getVoteValue('son derece kalıcı')
        };

        // 10. Sillage (Yayılım / Fark Edilebilirlik)
        const sillageBreakdown = {
            intimate: getVoteValue('yakın'),
            moderate: getVoteValue('orta'),
            strong: getVoteValue('güçlü'),
            enormous: getVoteValue('çok güçlü')
        };

        // 11. Gender Voting (Cinsiyet Algısı)
        const genderVoting = {
            female: getVoteValue('kadın'),
            moreFemale: getVoteValue('daha kadınsı'),
            unisex: getVoteValue('unisex'),
            moreMale: getVoteValue('daha erkeksi'),
            male: getVoteValue('erkek')
        };

        // 12. Price Value (Fiyat Değer Değerlendirmesi)
        const priceVoting = {
            wayOverpriced: getVoteValue('çok aşırı pahalı'),
            overpriced: getVoteValue('pahalı'),
            fair: getVoteValue('normal'),
            goodValue: getVoteValue('uygun fiyat'),
            greatValue: getVoteValue('mükemmel fiyat')
        };

        // 13. Reminds me of (Bu parfüm bana şunu hatırlatıyor)
        const remindsMeOf = [];
        const bodyLines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
        const idxReminds = bodyLines.indexOf('Bu parfüm bana şunu hatırlatıyor');
        const idxAlsoLike = bodyLines.indexOf('Bunu beğenenler bunları da beğeniyor');

        if (idxReminds !== -1) {
            const endIdx = idxAlsoLike !== -1 ? idxAlsoLike : bodyLines.length;
            const remindLines = bodyLines.slice(idxReminds + 1, endIdx);
            
            // Extract pairs: BRAND \n Perfume Name
            for (let i = 0; i < remindLines.length - 1; i++) {
                if (remindLines[i] === 'Öner' || remindLines[i] === 'Karşılaştır') continue;
                if (remindLines[i].toUpperCase() === remindLines[i] && remindLines[i].length >= 2 && !remindLines[i].match(/^\d+$/)) {
                    const brand = remindLines[i];
                    const name = remindLines[i+1];
                    if (name && name !== 'Karşılaştır' && name !== 'Öner') {
                        remindsMeOf.push({ brand, name });
                        i++;
                    }
                }
            }
        }

        // 14. People who like this also like (Bunu beğenenler bunları da beğeniyor)
        const peopleAlsoLike = [];
        if (idxAlsoLike !== -1) {
            const endIdx = bodyLines.indexOf('Daha fazla öneri bul') !== -1 ? bodyLines.indexOf('Daha fazla öneri bul') : bodyLines.length;
            const likeLines = bodyLines.slice(idxAlsoLike + 1, endIdx);

            for (let i = 0; i < likeLines.length - 1; i++) {
                if (likeLines[i] === 'Karşılaştır' || likeLines[i] === 'Öner') continue;
                if (likeLines[i].toUpperCase() === likeLines[i] && likeLines[i].length >= 2 && !likeLines[i].match(/^\d+$/)) {
                    const brand = likeLines[i];
                    const name = likeLines[i+1];
                    if (name && name !== 'Karşılaştır' && name !== 'Öner') {
                        peopleAlsoLike.push({ brand, name });
                        i++;
                    }
                }
            }
        }

        return {
            name: perfumeName,
            targetGender: targetGender,
            image: image,
            description: description,
            mainAccords: mainAccords,
            rating: {
                score: scoreStr,
                votesCount: votesStr,
                breakdown: ratingBreakdown
            },
            seasons: seasonBreakdown,
            notes: {
                top: topNotes,
                middle: middleNotes,
                base: baseNotes,
                all: allNotes
            },
            longevity: longevityBreakdown,
            sillage: sillageBreakdown,
            genderVoting: genderVoting,
            priceVoting: priceVoting,
            remindsMeOf: remindsMeOf.slice(0, 15),
            peopleAlsoLike: peopleAlsoLike.slice(0, 15)
        };
    }""")

        if not data or not data.get("name"):
            return None, "Sayfa içeriği tam okunamadı (Parfüm adı bulunamadı)"
        return data, None
    except Exception as e:
        return None, f"Ayrıştırma hatası: {e}"

def is_perfume_json_valid(file_path):
    if not os.path.exists(file_path):
        return False
    if os.path.getsize(file_path) < 10:
        return False
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            d = json.load(f)
            return bool(d and d.get("name"))
    except Exception:
        return False

def write_report(out_dir, total_count, successful_count, failed_list):
    report_file = os.path.join(out_dir, "report.txt")
    failed_count = len(failed_list)
    
    lines = [
        f"toplam parfüm: {total_count}",
        f"çekilen parfüm: {successful_count}",
        f"fail eden parfüm: {failed_count}"
    ]
    
    if failed_count == 0:
        lines.append("fail eden parfüm listesi: Yok")
    else:
        lines.append("fail eden parfüm listesi:")
        for f in failed_list:
            lines.append(f"  - {f['url']} | Ad: {f['name']} | Hata: {f['error']}")
            
    with open(report_file, "w", encoding="utf-8") as rf:
        rf.write("\n".join(lines) + "\n")
        
    print(f"\nRapor kaydedildi: {report_file} (Toplam: {total_count}, Çekilen: {successful_count}, Fail: {failed_count})")

def download_and_convert_perfume_image(img_url, out_dir, perfume_slug, api_request=None):
    if not img_url:
        return

    images_dir = os.path.join(out_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    output_webp_path = os.path.join(images_dir, f"{perfume_slug}.webp")

    # Skip if already exists and non-empty
    if os.path.exists(output_webp_path) and os.path.getsize(output_webp_path) > 0:
        return

    try:
        image_bytes = None

        # Tarayıcı bağlamı üzerinden indir: SOCKS5 proxy aktifse görseller de oradan geçsin.
        if api_request is not None:
            try:
                resp = api_request.get(img_url, timeout=30000)
                if resp.ok:
                    image_bytes = resp.body()
            except Exception:
                image_bytes = None

        if image_bytes is None:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
            ssl_context = ssl._create_unverified_context()
            req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(req, context=ssl_context, timeout=30) as resp:
                image_bytes = resp.read()

        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        img.save(output_webp_path, "WEBP", quality=85, optimize=True)
        print(f"  --> Saved webp image: {output_webp_path}")
    except Exception as e:
        print(f"  --> Failed to download image ({img_url}): {e}")

import subprocess

# NordVPN macOS uygulamasının CLI'ı yok; `nordvpn://connect` deeplink'i her çağrıldığında
# "önerilen" sunucuya yeniden bağlanır ve çıkış IP'si değişir (ölçüm: ~11 sn, 6/6 farklı IP).
# Deeplink country/country_id parametrelerini yok sayar, bu yüzden ülke seçilemiyor.
VPN_ROTATE_ENABLED = os.environ.get("SCRAPER_VPN_ROTATE", "1") != "0"
NORDVPN_APP_PATH = "/Applications/NordVPN.app"
IP_CHECK_URLS = ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"]


def get_public_ip(timeout=8):
    for url in IP_CHECK_URLS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
            with urllib.request.urlopen(req, context=ssl._create_unverified_context(), timeout=timeout) as resp:
                ip = resp.read().decode("utf-8").strip()
                if ip:
                    return ip
        except Exception:
            continue
    return None


def rotate_vpn_ip(max_wait=90):
    """
    NordVPN'i yeni bir sunucuya bağlayarak çıkış IP'sini değiştirir.
    Yeni IP'yi döner; değiştiremezse None döner (çağıran taraf normal cooldown'a düşer).
    """
    if not VPN_ROTATE_ENABLED:
        return None
    if sys.platform != "darwin" or not os.path.exists(NORDVPN_APP_PATH):
        print("  [VPN] NordVPN.app bulunamadı, IP rotasyonu atlanıyor.")
        return None

    old_ip = get_public_ip()
    print(f"  [VPN] Mevcut IP: {old_ip or 'bilinmiyor'} — yeni sunucuya bağlanılıyor...")

    try:
        subprocess.run(["open", "-g", "nordvpn://connect"], check=True, timeout=15)
    except Exception as e:
        print(f"  [VPN] Deeplink tetiklenemedi: {e}")
        return None

    waited = 0
    while waited < max_wait:
        time.sleep(3)
        waited += 3
        new_ip = get_public_ip()
        if new_ip and new_ip != old_ip:
            print(f"  [VPN] IP değişti: {old_ip} -> {new_ip} ({waited} sn)")
            return new_ip

    print(f"  [VPN] {max_wait} sn içinde IP değişmedi (hâlâ {old_ip}).")
    return None


# ---------------------------------------------------------------------------
# 2. kademe: NordVPN SOCKS5 proxy'leri
# VPN rotasyonu tüm IP'leri aynı /24 içinden verdiği için site blok'u blok bazlıysa
# rotasyon yetmez. Bu kademe sistem VPN'ine dokunmadan başka ülkelerden çıkış sağlar.
# ---------------------------------------------------------------------------
import socket
import struct
import threading
import select

NORD_SOCKS_USER = os.environ.get("NORD_SERVICE_USER", "")
NORD_SOCKS_PASS = os.environ.get("NORD_SERVICE_PASS", "")
VPN_ROTATE_MAX_ATTEMPTS = int(os.environ.get("SCRAPER_VPN_MAX_ATTEMPTS", "2"))

NORD_SOCKS_ENDPOINTS = [
    ("amsterdam.nl.socks.nordhold.net", 1080),
    ("stockholm.se.socks.nordhold.net", 1080),
    ("nl.socks.nordhold.net", 1080),
    ("se.socks.nordhold.net", 1080),
    ("atlanta.us.socks.nordhold.net", 1080),
    ("dallas.us.socks.nordhold.net", 1080),
    ("los-angeles.us.socks.nordhold.net", 1080),
    ("us.socks.nordhold.net", 1080),
]


def _recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def _read_socks_addr_packet(sock):
    """VER/CMD(REP)/RSV/ATYP + adres + port paketini ham bayt olarak okur."""
    head = _recv_exact(sock, 4)
    if not head:
        return None
    atyp = head[3]
    if atyp == 1:
        addr = _recv_exact(sock, 4)
    elif atyp == 3:
        ln = _recv_exact(sock, 1)
        if not ln:
            return None
        addr = ln + _recv_exact(sock, ln[0])
    elif atyp == 4:
        addr = _recv_exact(sock, 16)
    else:
        return None
    port = _recv_exact(sock, 2)
    if addr is None or port is None:
        return None
    return head + addr + port


class NordSocksRelay:
    """
    Chromium kimlik doğrulamalı SOCKS5'i desteklemiyor (Playwright doğrudan
    "Browser does not support socks5 proxy authentication" hatası veriyor).
    Bu sınıf 127.0.0.1 üzerinde kimlik doğrulamasız bir SOCKS5 ucu açar ve
    trafiği Nord'un kimlik doğrulamalı SOCKS5 sunucusuna aktarır.
    """

    def __init__(self, upstream_host, upstream_port, username, password):
        self.upstream = (upstream_host, upstream_port)
        self.username = username.encode()
        self.password = password.encode()
        self._stop = False
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(128)
        self.port = self.sock.getsockname()[1]
        self.thread = threading.Thread(target=self._serve, daemon=True)
        self.thread.start()

    def stop(self):
        self._stop = True
        try:
            self.sock.close()
        except Exception:
            pass

    def _serve(self):
        while not self._stop:
            try:
                conn, _ = self.sock.accept()
            except OSError:
                return
            threading.Thread(target=self._handle, args=(conn,), daemon=True).start()

    def _handle(self, local):
        up = None
        try:
            greeting = _recv_exact(local, 2)
            if not greeting or greeting[0] != 5:
                return
            if _recv_exact(local, greeting[1]) is None:
                return
            local.sendall(b"\x05\x00")  # yerel tarafta kimlik doğrulama yok

            request = _read_socks_addr_packet(local)
            if request is None:
                return

            up = socket.create_connection(self.upstream, timeout=20)
            up.sendall(b"\x05\x01\x02")  # sadece user/pass yöntemi
            if _recv_exact(up, 2) != b"\x05\x02":
                local.sendall(b"\x05\x01\x00\x01" + b"\x00" * 6)
                return
            up.sendall(
                b"\x01"
                + bytes([len(self.username)]) + self.username
                + bytes([len(self.password)]) + self.password
            )
            auth = _recv_exact(up, 2)
            if not auth or auth[1] != 0:
                local.sendall(b"\x05\x01\x00\x01" + b"\x00" * 6)
                return

            up.sendall(request)
            reply = _read_socks_addr_packet(up)
            if reply is None:
                local.sendall(b"\x05\x01\x00\x01" + b"\x00" * 6)
                return
            local.sendall(reply)
            if reply[1] != 0:
                return

            self._pipe(local, up)
        except Exception:
            pass
        finally:
            for s in (local, up):
                try:
                    if s:
                        s.close()
                except Exception:
                    pass

    @staticmethod
    def _pipe(a, b):
        pair = [a, b]
        while True:
            try:
                readable, _, errored = select.select(pair, [], pair, 120)
            except Exception:
                return
            if errored or not readable:
                return
            for s in readable:
                other = b if s is a else a
                try:
                    data = s.recv(65536)
                    if not data:
                        return
                    other.sendall(data)
                except Exception:
                    return


def probe_ip_via_socks(relay_port, timeout=15):
    """Relay gerçekten çalışıyor mu ve hangi IP'den çıkıyoruz — kimlik bilgisi doğrulaması."""
    host, port = "api.ipify.org", 443
    try:
        s = socket.create_connection(("127.0.0.1", relay_port), timeout=timeout)
        s.settimeout(timeout)
        s.sendall(b"\x05\x01\x00")
        if _recv_exact(s, 2) != b"\x05\x00":
            s.close()
            return None
        s.sendall(b"\x05\x01\x00\x03" + bytes([len(host)]) + host.encode() + struct.pack("!H", port))
        reply = _read_socks_addr_packet(s)
        if not reply or reply[1] != 0:
            s.close()
            return None

        try:
            tls = ssl.create_default_context().wrap_socket(s, server_hostname=host)
        except ssl.SSLError:
            # Bu Python kurulumunda CA kökleri yok; probe yalnızca kendi çıkış IP'mizi
            # sorguladığı için doğrulamasız devam etmek yeterli.
            s.close()
            s = socket.create_connection(("127.0.0.1", relay_port), timeout=timeout)
            s.settimeout(timeout)
            s.sendall(b"\x05\x01\x00")
            if _recv_exact(s, 2) != b"\x05\x00":
                s.close()
                return None
            s.sendall(b"\x05\x01\x00\x03" + bytes([len(host)]) + host.encode() + struct.pack("!H", port))
            reply = _read_socks_addr_packet(s)
            if not reply or reply[1] != 0:
                s.close()
                return None
            tls = ssl._create_unverified_context().wrap_socket(s, server_hostname=host)

        tls.sendall(f"GET / HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\nUser-Agent: curl/8.0\r\n\r\n".encode())
        raw = b""
        while True:
            chunk = tls.recv(4096)
            if not chunk:
                break
            raw += chunk
        tls.close()

        # chunked encoding'e takılmamak için gövdeden IP'yi doğrudan ayıkla
        body = raw.split(b"\r\n\r\n", 1)[-1].decode("utf-8", "replace")
        match = re.search(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", body)
        return match.group(0) if match else None
    except Exception:
        return None


def start_next_socks_proxy(state):
    """
    Sıradaki Nord SOCKS5 ucuna geçer. Başarılıysa (relay, endpoint_adı, çıkış_ip)
    döner, başka denenecek uç kalmadıysa veya kimlik bilgisi yoksa None döner.
    """
    if not (NORD_SOCKS_USER and NORD_SOCKS_PASS):
        print("  [PROXY] NORD_SERVICE_USER / NORD_SERVICE_PASS tanımlı değil, SOCKS5 kademesi atlanıyor.")
        print("  [PROXY] Bilgileri Nord panelinden alabilirsin: nordaccount.com -> NordVPN -> Manual setup -> Service credentials")
        return None

    while state["idx"] + 1 < len(NORD_SOCKS_ENDPOINTS):
        state["idx"] += 1
        host, port = NORD_SOCKS_ENDPOINTS[state["idx"]]

        if state.get("relay"):
            state["relay"].stop()
            state["relay"] = None

        print(f"  [PROXY] SOCKS5 ucuna geçiliyor: {host}:{port}")
        try:
            relay = NordSocksRelay(host, port, NORD_SOCKS_USER, NORD_SOCKS_PASS)
        except Exception as e:
            print(f"  [PROXY] Relay başlatılamadı: {e}")
            continue

        exit_ip = probe_ip_via_socks(relay.port)
        if exit_ip:
            state["relay"] = relay
            print(f"  [PROXY] Bağlandı — çıkış IP: {exit_ip} (yerel relay 127.0.0.1:{relay.port})")
            return relay, host, exit_ip

        relay.stop()
        print(f"  [PROXY] {host} üzerinden çıkış doğrulanamadı (kimlik bilgisi hatalı olabilir), sıradaki uç deneniyor...")

    print("  [PROXY] Denenecek SOCKS5 ucu kalmadı.")
    return None


USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
]

def scrape_brand_perfumes(brand_identifier, max_perfumes=None, delay=2.0):
    """
    Given a brand name or slug (e.g. 'giorgio_armani' or 'Xerjoff' or 'dior'),
    loads the brand JSON file, loops through its perfumes, and scrapes each detail page.
    """
    proxy_state = {"relay": None, "idx": -1}
    try:
        return _scrape_brand_perfumes(brand_identifier, max_perfumes, delay, proxy_state)
    finally:
        if proxy_state["relay"]:
            proxy_state["relay"].stop()


def _scrape_brand_perfumes(brand_identifier, max_perfumes, delay, proxy_state):
    slug = brand_identifier.lower().replace(" ", "_").replace("-", "_")

    brand_file = f"scrape_files/brands/{slug}_fragrantica_tr.json"
    if not os.path.exists(brand_file):
        brand_file = f"scrape_files/brands/{slug}_fragrantica.json"
    
    if not os.path.exists(brand_file):
        brands_dir = "scrape_files/brands"
        matches = [f for f in os.listdir(brands_dir) if slug in f] if os.path.exists(brands_dir) else []
        if matches:
            brand_file = os.path.join(brands_dir, matches[0])
        else:
            print(f"Error: Brand file for '{brand_identifier}' not found in scrape_files/brands/")
            return

    print(f"Loading brand file: {brand_file}")
    with open(brand_file, "r", encoding="utf-8") as f:
        brand_data = json.load(f)

    perfumes_list = brand_data.get("perfumes", [])
    if max_perfumes:
        perfumes_list = perfumes_list[:max_perfumes]

    total_count = len(perfumes_list)
    out_dir = os.path.join("scrape_files/perfumes", slug)
    report_file = os.path.join(out_dir, "report.txt")

    items_info = []
    for item in perfumes_list:
        url = item.get("url", "")
        item_name = item.get("name") or url
        tr_url = url.replace("www.fragrantica.com", "www.fragrantica.tr")
        if "/perfume/" in tr_url:
            tr_url = tr_url.replace("/perfume/", "/perfumes/")

        perfume_slug = tr_url.split("/")[-1].replace(".html", "").lower().replace("-", "_")
        out_file = os.path.join(out_dir, f"{perfume_slug}.json")
        items_info.append({
            "item_name": item_name,
            "tr_url": tr_url,
            "perfume_slug": perfume_slug,
            "out_file": out_file
        })

    os.makedirs(out_dir, exist_ok=True)
    attempt_cooldown = 20
    vpn_attempts = 0

    with sync_playwright() as p:
        while True:
            saved_items = [i for i in items_info if is_perfume_json_valid(i["out_file"])]
            to_scrape_items = [i for i in items_info if not is_perfume_json_valid(i["out_file"])]

            if os.path.exists(report_file):
                try:
                    with open(report_file, "r", encoding="utf-8") as rf:
                        rep_text = rf.read()
                    if "fail eden parfüm: 0" in rep_text and len(saved_items) == total_count:
                        print(f"[SKIP] Marka '{brand_identifier}' zaten eksiksiz tamamlanmış ({total_count}/{total_count} parfüm). Atlanıyor.")
                        return
                except Exception:
                    pass

            if len(to_scrape_items) == 0:
                print(f"[SKIP] Marka '{brand_identifier}' için tüm {total_count} parfüm JSON'ları zaten kayıtlı. Rapor güncelleniyor...")
                write_report(out_dir, total_count, len(saved_items), [])
                return

            print(f"\n==================================================")
            print(f"Marka: {brand_data.get('title', brand_identifier)}")
            print(f"Toplam Parfüm: {total_count} | Zaten Kayıtlı: {len(saved_items)} | Çekilecek: {len(to_scrape_items)}")
            print(f"==================================================")

            failed_details = {}
            consecutive_rate_limit_count = 0
            rate_limit_triggered = False

            ua = random.choice(USER_AGENTS)
            launch_kwargs = {
                "headless": True,
                "args": ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            }
            if proxy_state["relay"]:
                # Relay kimlik doğrulamasız olduğu için Chromium'a user/pass vermiyoruz.
                launch_kwargs["proxy"] = {"server": f"socks5://127.0.0.1:{proxy_state['relay'].port}"}
            browser = p.chromium.launch(**launch_kwargs)
            context = browser.new_context(
                user_agent=ua,
                locale="tr-TR",
                viewport={"width": 1280, "height": 800},
                extra_http_headers={
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
                }
            )
            context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page = context.new_page()

            for idx, i_info in enumerate(to_scrape_items, 1):
                tr_url = i_info["tr_url"]
                perfume_slug = i_info["perfume_slug"]
                out_file = i_info["out_file"]
                item_name = i_info["item_name"]

                print(f"\n[{idx}/{len(to_scrape_items)}] Scraping perfume: {tr_url}")
                try:
                    p_data, error_reason = parse_perfume_page(page, tr_url)
                    if p_data:
                        consecutive_rate_limit_count = 0
                        brand_name = brand_data.get("title", brand_identifier)
                        ordered_data = {
                            "name": p_data.get("name"),
                            "targetGender": p_data.get("targetGender"),
                            "image": p_data.get("image"),
                            "url": tr_url,
                            "brand": brand_name,
                            "description": p_data.get("description"),
                            "mainAccords": p_data.get("mainAccords"),
                            "rating": p_data.get("rating"),
                            "seasons": p_data.get("seasons"),
                            "notes": p_data.get("notes"),
                            "longevity": p_data.get("longevity"),
                            "sillage": p_data.get("sillage"),
                            "genderVoting": p_data.get("genderVoting"),
                            "priceVoting": p_data.get("priceVoting"),
                            "remindsMeOf": p_data.get("remindsMeOf"),
                            "peopleAlsoLike": p_data.get("peopleAlsoLike")
                        }
                        with open(out_file, "w", encoding="utf-8") as out_f:
                            json.dump(ordered_data, out_f, ensure_ascii=False, indent=2)
                        print(f"  --> Saved: {ordered_data['name']} ({ordered_data['rating']['score']}/5 score, {len(ordered_data['mainAccords'])} accords) to {out_file}")

                        if p_data.get("image"):
                            download_and_convert_perfume_image(
                                p_data.get("image"), out_dir, perfume_slug, api_request=context.request
                            )
                    else:
                        if error_reason and any(code in error_reason for code in ["400", "403", "429", "503", "Forbidden", "Too Many Requests", "Bad Request"]):
                            consecutive_rate_limit_count += 1
                        else:
                            consecutive_rate_limit_count = 0

                        failed_details[tr_url] = {
                            "name": item_name,
                            "error": error_reason or "Bilinmeyen hata"
                        }
                        print(f"  --> HATA: {tr_url} - {error_reason}")
                except Exception as e:
                    failed_details[tr_url] = {
                        "name": item_name,
                        "error": str(e)
                    }
                    print(f"  --> HATA: {tr_url} - {e}")

                if consecutive_rate_limit_count >= 3:
                    rate_limit_triggered = True
                    browser.close()
                    break

                sleep_time = random.uniform(delay + 0.5, delay + 3.0)
                time.sleep(sleep_time)

            if not rate_limit_triggered:
                browser.close()

            final_saved = [i for i in items_info if is_perfume_json_valid(i["out_file"])]
            all_failed_list = []
            for i in items_info:
                if not is_perfume_json_valid(i["out_file"]):
                    err_info = failed_details.get(i["tr_url"], {"name": i["item_name"], "error": "IP Engellendi / Kısıtlandı (HTTP 400 / 403 / 429)"})
                    all_failed_list.append({
                        "url": i["tr_url"],
                        "name": err_info["name"],
                        "error": err_info["error"]
                    })
            write_report(out_dir, total_count, len(final_saved), all_failed_list)

            if rate_limit_triggered:
                print("\n" + "!"*65)
                print(f" [OTONOM MOD] Rate Limit / Kısıtlama hatası (HTTP 400/403/429) algılandı!")
                print("!"*65 + "\n")

                escalated = False

                # 1. kademe: sistem VPN'ini yeni bir sunucuya bağla.
                if proxy_state["relay"] is None and vpn_attempts < VPN_ROTATE_MAX_ATTEMPTS:
                    if rotate_vpn_ip():
                        vpn_attempts += 1
                        attempt_cooldown = 20
                        escalated = True
                        time.sleep(5)
                        print(f"\nYeni IP ve taze oturum ile devam ediliyor "
                              f"(VPN rotasyonu {vpn_attempts}/{VPN_ROTATE_MAX_ATTEMPTS}).\n")

                # 2. kademe: VPN rotasyonu yetmedi (muhtemelen /24 bloğu banlı) -> SOCKS5.
                if not escalated:
                    if proxy_state["relay"] is None:
                        print(f" VPN rotasyonu {vpn_attempts} denemede yetmedi, SOCKS5 proxy'ye geçiliyor.")
                    else:
                        print(" Mevcut SOCKS5 ucu da kısıtlandı, sıradaki uca geçiliyor.")

                    result = start_next_socks_proxy(proxy_state)
                    if result:
                        _, endpoint, exit_ip = result
                        attempt_cooldown = 20
                        escalated = True
                        time.sleep(5)
                        print(f"\n{endpoint} ({exit_ip}) üzerinden taze oturum ile devam ediliyor.\n")

                # Hiçbir kademe işe yaramadı: eskisi gibi kademeli soğuma.
                if not escalated:
                    print(f" IP değiştirilemedi. Kısıtlamanın geçmesi için {attempt_cooldown} saniye bekleniyor...")
                    time.sleep(attempt_cooldown)
                    attempt_cooldown = min(attempt_cooldown + 15, 60)
                    print("\nOtomatik olarak taze oturum ile kalınan yerden devam ediliyor...\n")
            else:
                break

            sleep_time = random.uniform(delay, delay + 2.5)
            time.sleep(sleep_time)

        browser.close()

    final_saved = [i for i in items_info if is_perfume_json_valid(i["out_file"])]
    all_failed_list = []
    for i in items_info:
        if not is_perfume_json_valid(i["out_file"]):
            err_info = failed_details.get(i["tr_url"], {"name": i["item_name"], "error": "Çekilemedi / Eksik"})
            all_failed_list.append({
                "url": i["tr_url"],
                "name": err_info["name"],
                "error": err_info["error"]
            })

    write_report(out_dir, total_count, len(final_saved), all_failed_list)

def check_proxy_setup():
    """`--check-proxy`: VPN/SOCKS5 kurulumunu tarama yapmadan test eder."""
    print(f"Doğrudan çıkış IP: {get_public_ip() or 'okunamadı'}\n")

    if not (NORD_SOCKS_USER and NORD_SOCKS_PASS):
        print("NORD_SERVICE_USER / NORD_SERVICE_PASS bu kabukta tanımlı DEĞİL.")
        print("Kalıcı hale getirmek için ~/.zshrc dosyana ekle:")
        print('  export NORD_SERVICE_USER="..."')
        print('  export NORD_SERVICE_PASS="..."')
        print("Sonra yeni bir terminal aç veya `source ~/.zshrc` çalıştır.")
        print("\nBilgiler: nordaccount.com -> NordVPN -> Manual setup -> Service credentials")
        print("(Hesap şifren DEĞİL, ayrı üretilen servis bilgileri.)")
        return

    print(f"Kimlik bilgisi bulundu: kullanıcı '{NORD_SOCKS_USER}', parola {len(NORD_SOCKS_PASS)} karakter")
    print("SOCKS5 uçları test ediliyor...\n")

    working = 0
    for host, port in NORD_SOCKS_ENDPOINTS:
        try:
            relay = NordSocksRelay(host, port, NORD_SOCKS_USER, NORD_SOCKS_PASS)
        except Exception as e:
            print(f"  {host:<42} relay başlatılamadı: {e}")
            continue
        exit_ip = probe_ip_via_socks(relay.port)
        relay.stop()
        if exit_ip:
            working += 1
            print(f"  {host:<42} OK          -> {exit_ip}")
        else:
            print(f"  {host:<42} BAŞARISIZ")

    print(f"\n{working}/{len(NORD_SOCKS_ENDPOINTS)} uç çalışıyor.")
    if working == 0:
        print("Hiçbir uç çalışmadı. En olası sebep kimlik bilgilerinin yanlış olması —")
        print("hesap şifreni değil, panelden üretilen 'service credentials' bilgilerini kullanman gerekiyor.")


def scrape_all_brands(max_perfumes=None, delay=2.0):
    brands_dir = "scrape_files/brands"
    if not os.path.exists(brands_dir):
        print(f"Hata: '{brands_dir}' klasörü bulunamadı.")
        return

    brand_files = sorted([f for f in os.listdir(brands_dir) if f.endswith(".json")])
    print(f"'{brands_dir}' klasöründe {len(brand_files)} marka dosyası bulundu. Tüm markalar sırayla çekiliyor...\n")

    for idx, b_file in enumerate(brand_files, 1):
        brand_slug = b_file.replace("_fragrantica_tr.json", "").replace("_fragrantica.json", "")
        print(f"\n==================================================")
        print(f"[{idx}/{len(brand_files)}] Marka kontrol ediliyor: {b_file}")
        print(f"==================================================")
        try:
            scrape_brand_perfumes(brand_slug, max_perfumes=max_perfumes, delay=delay)
        except Exception as e:
            print(f"Marka '{brand_slug}' çekilirken hata oluştu: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check-proxy":
        check_proxy_setup()
    elif len(sys.argv) == 1 or sys.argv[1] == "--all":
        limit_arg = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else (int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None)
        print("Parametre girilmedi veya --all seçildi. Tüm markalar sırayla çekiliyor...")
        scrape_all_brands(max_perfumes=limit_arg)
    else:
        brand_arg = sys.argv[1]
        limit_arg = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
        scrape_brand_perfumes(brand_arg, max_perfumes=limit_arg)

