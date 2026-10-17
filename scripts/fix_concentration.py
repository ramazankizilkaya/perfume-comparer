"""
Yanlış "Edp" esans tipini hem scrape_files/ JSON dosyalarında hem de veritabanında düzeltir.

Arka plan: eski scraper her parfüme "concentration": "Edp" yazıyordu ve import_data.py bu
değere güveniyordu. Doğru kural artık scripts/concentration.py içindedir: esans tipi yalnızca
parfümün adından okunur, adda ipucu yoksa boş kalır.

Bu betik iki iş yapar:
  1. scrape_files/perfumes/<marka>/<parfüm>.json dosyalarındaki "concentration" alanını
     yeni kurala göre yeniden yazar (yalnızca değişen dosyalar).
  2. Veritabanındaki perfumes satırlarını YERİNDE günceller (concentration + slug).
     Parfüm id'leri değişmez; yorum, puan, favori ve ilişkiler korunur. Yeni slug, import_data.py
     yeniden çalıştırılsa üretilecek slug ile birebir aynıdır.

Kullanım:
    python3 scripts/fix_concentration.py --dry-run     # ne değişeceğini raporlar, yazmaz
    python3 scripts/fix_concentration.py               # JSON dosyalarını ve veritabanını günceller
    python3 scripts/fix_concentration.py --files-only  # yalnızca JSON dosyaları
    python3 scripts/fix_concentration.py --db-only     # yalnızca veritabanı

Veritabanı güncellemesinden sonra API'yi yeniden başlat (sitemap önbelleği 1 saatliktir).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

import import_data  # noqa: E402
from concentration import parse_concentration  # noqa: E402


def build_catalog(legacy: bool) -> import_data.Catalog:
    """legacy=True: eski kural (JSON'daki değere güven) -> veritabanındaki mevcut slug'lar."""
    catalog = import_data.Catalog()
    catalog.legacy_concentration = legacy
    catalog.build(import_data.load_brands(None, None))
    return catalog


def plan_db_changes(old: import_data.Catalog, new: import_data.Catalog) -> list[tuple[str, str, str | None]]:
    """(eski_slug, yeni_slug, yeni_concentration) listesi; yalnızca değişenler."""
    if len(old.perfumes) != len(new.perfumes):
        raise SystemExit("Eski ve yeni katalog farklı sayıda parfüm üretti; betik durduruldu.")

    changes = []
    for row_old, row_new in zip(old.perfumes, new.perfumes):
        # perfumes satırı: [id, brand_id, name, slug, gender, concentration, ...]
        if row_old[2] != row_new[2]:
            raise SystemExit(f"Sıra kaydı: {row_old[2]!r} != {row_new[2]!r}")
        if row_old[3] != row_new[3] or row_old[5] != row_new[5]:
            changes.append((row_old[3], row_new[3], row_new[5]))
    return changes


def rewrite_json_files(dry_run: bool) -> Counter:
    stats = Counter()
    for brand in import_data.load_brands(None, None):
        for path, data in import_data.load_perfume_files(brand["key"]):
            listed = brand["listing"].get(data.get("url"), {}) if data.get("url") else {}
            name = (listed.get("title") or "").strip()
            if not name:
                raw = (data.get("name") or "").strip()
                if raw.lower().endswith(brand["name"].lower()):
                    raw = raw[: -len(brand["name"])].strip()
                name = raw

            wanted = parse_concentration(name)
            stats[wanted or "(boş)"] += 1
            if data.get("concentration") == wanted:
                continue

            stats["değişen dosya"] += 1
            if dry_run:
                continue
            data["concentration"] = wanted
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    return stats


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def apply_db_changes(changes: list[tuple[str, str, str | None]], dry_run: bool) -> None:
    env = import_data.connection_env()
    import_data.ensure_schema(env)

    db_slugs = set(import_data.psql_scalar(env, "select string_agg(slug, E'\\n') from perfumes").split("\n"))
    missing = [c for c in changes if c[0] not in db_slugs]
    if missing:
        print(f"  Uyarı: {len(missing)} parfüm veritabanında yok (slug eşleşmedi); atlanıyor. "
              f"Örnek: {missing[0][0]}")
    changes = [c for c in changes if c[0] in db_slugs]
    print(f"  Veritabanında güncellenecek satır: {len(changes)}")
    if dry_run or not changes:
        return

    values = ",\n".join(
        f"({sql_literal(o)}, {sql_literal(n)}, {sql_literal(c)})" for o, n, c in changes
    )
    # Slug tekil indeksi satır satır kontrol edildiği için iki adımda yazılır:
    # önce geçici bir sonek ile, sonra sonek kaldırılarak.
    sql = f"""
BEGIN;
CREATE TEMP TABLE conc_fix (old_slug text PRIMARY KEY, new_slug text, concentration text) ON COMMIT DROP;
INSERT INTO conc_fix VALUES
{values};
UPDATE perfumes p SET slug = f.new_slug || '~fix', concentration = f.concentration
  FROM conc_fix f WHERE p.slug = f.old_slug;
UPDATE perfumes SET slug = left(slug, -4) WHERE slug LIKE '%~fix';
COMMIT;
"""
    result = subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1"], input=sql,
                            text=True, capture_output=True, env=env)
    if result.returncode != 0:
        raise SystemExit(f"psql hatası:\n{result.stderr.strip()}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="Hiçbir şey yazmaz, raporlar.")
    parser.add_argument("--files-only", action="store_true", help="Yalnızca JSON dosyalarını düzeltir.")
    parser.add_argument("--db-only", action="store_true", help="Yalnızca veritabanını düzeltir.")
    args = parser.parse_args()

    if not args.files_only:
        print("Veritabanı planı hesaplanıyor (eski ve yeni kural)...")
        old = build_catalog(legacy=True)
        new = build_catalog(legacy=False)
        changes = plan_db_changes(old, new)
        conc_counts = Counter(c or "(boş)" for _, _, c in changes)
        print(f"  Değişen parfüm: {len(changes)} / {len(new.perfumes)}  -> {dict(conc_counts)}")
        for o, n, c in changes[:5]:
            print(f"    {o}  ->  {n}  [{c}]")
        apply_db_changes(changes, args.dry_run)

    if not args.db_only:
        print("JSON dosyaları taranıyor...")
        stats = rewrite_json_files(args.dry_run)
        print(f"  {dict(stats)}")

    print("Kuru çalışma: hiçbir şey yazılmadı." if args.dry_run else "Bitti.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
