#!/usr/bin/env python3
"""
Mağaza logolarini tek tip hale getirir.

Orijinal dosyalara dokunmaz: public/stores/ okunur, sonuclar
public/stores/same-size-logos/ altina yazilir.

Adimlar:
  1. SVG ise rsvg-convert ile yuksek cozunurlukte PNG'ye cevrilir.
  2. Logonun etrafindaki bos alan (seffaf veya beyaz) kirpilir; boylece
     dosyanin icine gomulmus rastgele bosluklar olcuyu bozmaz.
  3. Optik olcekleme: her logo, kapladigi ALAN ayni olacak sekilde
     buyutulup kucultulur. Kare logo ile uzun yazi-logo boylece ayni
     gorsel agirliga sahip olur.
  4. Hepsi ayni 480x240 seffaf tuvalin ortasina yapistirilir.
  5. Kayipsiz WebP olarak kaydedilir.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "src/perfume-comparer-web"
SRC = WEB / "public/stores"
DST = SRC / "same-size-logos"
COMPONENT = WEB / "src/components/PerfumeWhereToBuySection.tsx"

CANVAS_W, CANVAS_H = 300, 300          # 1:1 kare tuval (kare kart kutusuyla ayni oran)
SAFE_W, SAFE_H = 260, 260              # kenar boslugu birakan guvenli alan
AREA_RATIO = 0.44                      # her logonun kaplayacagi hedef alan orani
MAX_UPSCALE = 8.0                      # tuval buyuk, ekranda kucuk cizildigi icin serbest

TARGET_AREA = SAFE_W * SAFE_H * AREA_RATIO


def load(path: Path) -> Image.Image:
    """Dosyayi RGBA olarak acar; SVG ise once PNG'ye cevirir."""
    if path.suffix.lower() == ".svg":
        png = subprocess.run(
            ["rsvg-convert", "-h", "600", "-f", "png", str(path)],
            check=True, capture_output=True,
        ).stdout
        tmp = DST / f".{path.stem}.tmp.png"
        tmp.write_bytes(png)
        img = Image.open(tmp).convert("RGBA")
        img.load()
        tmp.unlink()
        return img
    return Image.open(path).convert("RGBA")


def background_colour(img: Image.Image):
    """Kosedeki dort pikselden zemin rengini tahmin eder; kararsizsa None doner."""
    w, h = img.size
    corners = [img.getpixel(c)[:3] for c in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    first = corners[0]
    if any(max(abs(a - b) for a, b in zip(first, c)) > 10 for c in corners[1:]):
        return None
    return first


def trim(img: Image.Image) -> Image.Image:
    """
    Logonun cevresindeki bosluğu kirpar.

    - Seffafligi olan dosyalarda alfa kanalina bakilir.
    - Opak dosyalarda kose rengi zemin sayilir. Zemin ACIK ise (beyaz, gri)
      kirpilir ve seffaf yapilir, boylece kartin uzerinde kutu izi kalmaz.
    - Zemin KOYU veya renkli ise dokunulmaz: orada zeminin kendisi logonun
      parcasidir (Beymen, Sephora, Trendyol gibi kare marka karolari).
    """
    alpha = img.getchannel("A")
    if alpha.getextrema()[0] < 250:
        box = alpha.point(lambda a: 255 if a > 12 else 0).getbbox()
        return img.crop(box) if box else img

    bg = background_colour(img)
    if bg is None or (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) < 230:
        return img

    r, g, b = bg
    px = img.load()
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    for y in range(h):
        for x in range(w):
            pr, pg, pb, _ = px[x, y]
            if abs(pr - r) + abs(pg - g) + abs(pb - b) > 34:
                mpx[x, y] = 255
    box = mask.getbbox()
    if not box:
        return img

    out = img.copy()
    out.putalpha(mask.filter(ImageFilter.MaxFilter(3)))   # kenar pikselleri koru
    return out.crop(box)


def round_tile(img: Image.Image) -> Image.Image:
    """Kare, dolu marka karolarinin koselerini yuvarlar ki duvar tek tip dursun."""
    w, h = img.size
    if not (0.8 <= w / h <= 1.25):
        return img
    if img.getchannel("A").getextrema()[0] < 250:
        return img
    radius = round(min(w, h) * 0.17)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def normalize(path: Path) -> tuple[str, str]:
    img = trim(load(path))
    w, h = img.size

    # Alan bazli optik olcek, guvenli alana ve buyutme sinirina gore kisitlanir.
    scale = (TARGET_AREA / (w * h)) ** 0.5
    scale = min(scale, SAFE_W / w, SAFE_H / h, MAX_UPSCALE)
    new = (max(1, round(w * scale)), max(1, round(h * scale)))

    img = img.resize(new, Image.LANCZOS)
    if scale > 1.15:   # buyutulen kucuk logolarda kenarlari geri toparla
        img = img.filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=2))

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.paste(img, ((CANVAS_W - new[0]) // 2, (CANVAS_H - new[1]) // 2), img)

    out = DST / f"{path.stem}.webp"
    canvas.save(out, "WEBP", lossless=True, quality=100, method=6)
    return f"{w}x{h}", f"{new[0]}x{new[1]}"


def check() -> int:
    """
    Dogrulama: bilesenin kullandigi her logo diskte var mi ve hepsi ayni
    tuvale mi cizilmis? Tuval olcusu tutmazsa o logo arayuzde digerlerinden
    buyuk ya da kucuk gorunur, ki bu tam olarak onlemek istedigimiz sey.
    """
    referenced = re.findall(r'logoUrl: "(/stores/[^"]+)"', COMPONENT.read_text())
    if not referenced:
        print("HATA: bilesende hic logoUrl bulunamadi", file=sys.stderr)
        return 1

    problems = []
    for ref in referenced:
        path = WEB / "public" / ref.lstrip("/")
        if not path.is_file():
            problems.append(f"{ref}: dosya yok")
            continue
        with Image.open(path) as im:
            if im.size != (CANVAS_W, CANVAS_H):
                problems.append(f"{ref}: tuval {im.width}x{im.height}, beklenen {CANVAS_W}x{CANVAS_H}")

    for line in problems:
        print(f"HATA {line}", file=sys.stderr)
    if problems:
        print(f"\n{len(problems)} sorun bulundu.", file=sys.stderr)
        return 1
    print(f"{len(referenced)} logo dogrulandi: hepsi var ve hepsi {CANVAS_W}x{CANVAS_H} tuvalde.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="Uretme, sadece mevcut logolari dogrula.")
    args = ap.parse_args()

    if args.check:
        return check()

    if not SRC.is_dir():
        print(f"Kaynak klasor yok: {SRC}", file=sys.stderr)
        return 1
    DST.mkdir(exist_ok=True)

    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in {".webp", ".svg", ".png", ".jpg"})
    # Ayni isimde hem .svg hem .webp varsa vektor olani tercih et.
    best: dict[str, Path] = {}
    for p in files:
        cur = best.get(p.stem)
        if cur is None or (p.suffix.lower() == ".svg" and cur.suffix.lower() != ".svg"):
            best[p.stem] = p

    for stem, path in sorted(best.items()):
        src_size, drawn = normalize(path)
        print(f"{stem:14s} {path.name:20s} kirpilmis {src_size:>9s}  ->  cizilen {drawn:>9s}")
    print(f"\n{len(best)} logo yazildi: {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
