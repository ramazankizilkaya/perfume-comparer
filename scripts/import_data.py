#!/usr/bin/env python3
"""
scrape_files/ altındaki gerçek marka ve parfüm verisini Postgres'e aktarır.

Şemayı BU SCRIPT OLUŞTURMAZ. Tabloların tek sahibi .NET API'sidir
(EF Core, `dotnet run` ile açılışta kurar). Script sadece veri basar; böylece
şema iki yerde tanımlanmış olmaz.

Kullanım:
    python3 scripts/import_data.py                 # boş katalog varsayar, veriyi basar
    python3 scripts/import_data.py --reset         # katalogu uçurup baştan basar
    python3 scripts/import_data.py --reset-all     # kullanıcı/blog dahil her şeyi uçurur
    python3 scripts/import_data.py --reset --brands chanel,dior
    python3 scripts/import_data.py --reset --limit 5
    python3 scripts/import_data.py --dry-run       # hiçbir şey yazmaz, sadece rapor

Postgres'e psql üzerinden COPY ile yazar; ek bir Python paketi gerektirmez.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRAPE_DIR = ROOT / "scrape_files"
BRANDS_DIR = SCRAPE_DIR / "brands"
PERFUMES_DIR = SCRAPE_DIR / "perfumes"
API_DIR = ROOT / "src" / "PerfumeComparer"
# Development dosyası önce bakılır; yerel bağlantı dizesi orada tutuluyor.
APPSETTINGS = [API_DIR / "appsettings.Development.json", API_DIR / "appsettings.json"]

BRAND_FILE_SUFFIX = "_fragrantica_tr.json"
BRAND_TITLE_SUFFIX = " parfüm ve kolonya"

# Katalog tabloları: her içe aktarımda tamamen yeniden kurulur.
# perfumes'a bağlı kullanıcı verisi (yorum, puan, favori) CASCADE ile birlikte gider,
# çünkü parfüm id'leri her aktarımda yeniden üretilir.
CATALOG_TABLES = ["brands", "notes", "accords"]

# --reset-all: kullanıcı üretimi ne varsa o da gider.
ALL_TABLES = CATALOG_TABLES + ["users", "blog_posts", "dupe_brands"]

# Fragrantica sayfasındaki reklam/filtre bloklarından sızan sahte "akor" isimleri.
ACCORD_NOISE_PATTERNS = [
    re.compile(r"^\$+$"),
    re.compile(r"satın al", re.IGNORECASE),
    re.compile(r"satılık", re.IGNORECASE),
    re.compile(r"şurada ara", re.IGNORECASE),
]
ACCORD_NOISE_NAMES = {"kadın", "erkek", "unisex"}


# --------------------------------------------------------------------- slug

_SLUG_MAP = {
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ı": "i", "I": "i", "İ": "i",
    "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
    "â": "a", "Â": "a",
    "î": "i", "Î": "i",
    "û": "u", "Û": "u",
}

_ASCII_ALNUM = re.compile(r"[0-9A-Za-z]")


def slugify(text: str) -> str:
    """src/PerfumeComparer/Domain/SlugHelper.cs ile birebir aynı sonucu üretir."""
    out: list[str] = []
    last_was_dash = True  # baştaki tireleri engelle

    for ch in text:
        mapped = _SLUG_MAP.get(ch)
        if mapped is None and _ASCII_ALNUM.match(ch):
            mapped = ch.lower()

        if mapped is None:
            if not last_was_dash:
                out.append("-")
                last_was_dash = True
        else:
            out.append(mapped)
            last_was_dash = False

    return "".join(out).rstrip("-")


def fold(text: str) -> str:
    """Eşleştirme anahtarı: aksanları at, küçült, harf-rakam dışını sil."""
    text = text.replace("İ", "i").replace("I", "i").replace("ı", "i")
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if c.isalnum() and not unicodedata.combining(c))


# ------------------------------------------------------------------ parsing


def parse_votes(value) -> int:
    """'20,974' -> 20974, '9.9k' -> 9900, '' -> 0."""
    if value is None:
        return 0
    text = str(value).strip().lower().replace(",", "").replace(" ", "")
    if not text:
        return 0
    multiplier = 1
    if text.endswith("k"):
        multiplier, text = 1000, text[:-1]
    elif text.endswith("m"):
        multiplier, text = 1_000_000, text[:-1]
    try:
        return int(round(float(text) * multiplier))
    except ValueError:
        return 0


def parse_decimal(value, default=0.0) -> float:
    if value is None:
        return default
    text = str(value).strip().replace("%", "").replace(",", ".")
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def parse_year(value):
    if not value:
        return None
    match = re.search(r"(1[5-9]\d{2}|20\d{2})", str(value))
    return int(match.group(1)) if match else None


GENDER_MAP = {"male": "Male", "female": "Female", "unisex": "Unisex"}

TARGET_GENDER_MAP = {
    "erkekler için": "Male",
    "kadınlar için": "Female",
    "kadınlar ve erkekler için": "Unisex",
}


def parse_gender(listing_gender, target_gender) -> str:
    if listing_gender and listing_gender.strip().lower() in GENDER_MAP:
        return GENDER_MAP[listing_gender.strip().lower()]
    if target_gender and target_gender.strip().lower() in TARGET_GENDER_MAP:
        return TARGET_GENDER_MAP[target_gender.strip().lower()]
    return "Unisex"


# Uzundan kısaya: "eau de parfum" testi "parfum" testinden önce gelmeli.
CONCENTRATION_TOKENS = [
    ("extrait de parfum", "Extrait"),
    ("parfum extrait", "Extrait"),
    ("eau de parfum", "Edp"),
    ("eau de toilette", "Edt"),
    ("eau de cologne", "Edc"),
    ("cologne intense", "Cologne"),
    ("cologne absolue", "Cologne"),
    ("eau fraiche", "EauFraiche"),
    ("eau fraîche", "EauFraiche"),
    ("roll-on", "RollOn"),
    ("cologne", "Cologne"),
    ("parfum", "Parfum"),
    ("edp", "Edp"),
    ("edt", "Edt"),
    ("edc", "Edc"),
]

CONCENTRATION_SLUGS = {
    "EauFraiche": "eau-fraiche",
    "Edc": "edc",
    "Cologne": "cologne",
    "Edt": "edt",
    "Edp": "edp",
    "Parfum": "parfum",
    "Extrait": "extrait-de-parfum",
    "RollOn": "roll-on",
    "Other": "diger",
}


def parse_concentration(name: str):
    lowered = f" {name.lower()} "
    for token, value in CONCENTRATION_TOKENS:
        if f" {token} " in lowered or lowered.endswith(f" {token} "):
            return value
    return None


# Bu eşleme src/PerfumeComparer/Domain/Lookups.cs -> FamilyFromAccord ile aynı
# kalmalı; ikisi de en baskın akordan koku ailesini türetir.
ACCORD_TO_FAMILY = {
    "Citrus": ["narenciye", "tuzlu", "ekşi"],
    "Floral": ["çiçeksi", "beyaz çiçeksi", "sarı çiçeksi", "gül", "iris", "menekşe", "tüberöz", "pudralı"],
    "Woody": ["odunsu", "paçuli", "ud", "toprak", "kozalaklı", "kum"],
    "Oriental": ["amber", "balsamik", "vanilya", "bal", "balmumu", "rom"],
    "Gourmand": ["tatlı", "karamel", "çikolata", "kakao", "kahve", "badem", "fındıksı",
                 "hindistancevizi", "laktonik", "sütlü", "gurme", "kiraz", "meyvemsi", "tropikal"],
    "Fresh": ["taze", "sulu", "deniz", "ozonik", "mineral", "yeşil", "sabunsu", "metalik",
              "aldehitli", "kafur"],
    "Aromatic": ["aromatik", "bitkisel", "anason", "taze baharatlı", "sıcak baharatlı",
                 "yumuşak baharatlı", "baharatlı", "tarçın", "terpenik"],
    "Fougere": ["lavanta", "yosunlu"],
    "Leather": ["deri", "animalik", "misk", "dumanlı", "tütün"],
}

FAMILY_BY_ACCORD = {accord: family for family, accords in ACCORD_TO_FAMILY.items() for accord in accords}


def family_from_accord(accord_name):
    if not accord_name:
        return None
    return FAMILY_BY_ACCORD.get(accord_name.strip().lower(), "Other")


def title_tr(text: str) -> str:
    """Türkçe duyarlı ilk harf büyütme: 'iris' -> 'İris', 'çiçeksi' -> 'Çiçeksi'."""
    if not text:
        return text
    first = "İ" if text[0] == "i" else text[0].upper()
    return first + text[1:]


def is_noise_accord(name: str) -> bool:
    lowered = name.strip().lower()
    if lowered in ACCORD_NOISE_NAMES:
        return True
    return any(pattern.search(name) for pattern in ACCORD_NOISE_PATTERNS)


SEASON_KEYS = [("spring", "Spring"), ("summer", "Summer"), ("autumn", "Autumn"), ("winter", "Winter")]


# ------------------------------------------------------------------ okuma


def brand_display_name(data: dict) -> str:
    title = (data.get("title") or "").strip()
    if title.lower().endswith(BRAND_TITLE_SUFFIX):
        return title[: -len(BRAND_TITLE_SUFFIX)].strip()
    for perfume in data.get("perfumes") or []:
        if perfume.get("brand"):
            return perfume["brand"].strip()
    return title


def media_path(local_path) -> str | None:
    """'scrape_files/brand_images/chanel.webp' -> '/media/brand_images/chanel.webp'."""
    if not local_path:
        return None
    relative = str(local_path).replace("\\", "/")
    if relative.startswith("scrape_files/"):
        relative = relative[len("scrape_files/"):]
    if not (SCRAPE_DIR / relative).exists():
        return None
    return "/media/" + relative


def load_brands(selected: list[str] | None, limit: int | None) -> list[dict]:
    """Marka dosyalarını okur; her marka için parfüm listesini de döner."""
    brands = []
    for path in sorted(BRANDS_DIR.glob(f"*{BRAND_FILE_SUFFIX}")):
        key = path.name[: -len(BRAND_FILE_SUFFIX)]
        if selected and key not in selected:
            continue
        if not (PERFUMES_DIR / key).is_dir():
            continue

        data = json.loads(path.read_text(encoding="utf-8"))
        bio = data.get("bio") or []
        brands.append({
            "key": key,
            "name": brand_display_name(data),
            "country": (data.get("country") or "").strip() or None,
            "description": "\n\n".join(b.strip() for b in bio if b and b.strip()) or None,
            "logo_url": media_path(data.get("localLogoPath")),
            "main_activity": (data.get("mainActivity") or "").strip() or None,
            "website_url": (data.get("brandWebsite") or "").strip() or None,
            "parent_company": (data.get("parentCompany") or "").strip() or None,
            "source_url": (data.get("data_source_url") or "").strip() or None,
            "listing": {p["url"]: p for p in (data.get("perfumes") or []) if p.get("url")},
        })

        if limit and len(brands) >= limit:
            break

    return brands


def load_perfume_files(brand_key: str) -> list[tuple[Path, dict]]:
    files = []
    for path in sorted((PERFUMES_DIR / brand_key).glob("*.json")):
        try:
            files.append((path, json.loads(path.read_text(encoding="utf-8"))))
        except (json.JSONDecodeError, UnicodeDecodeError):
            print(f"  ! okunamadı, atlandı: {path.relative_to(ROOT)}", file=sys.stderr)
    return files


# -------------------------------------------------------------------- COPY


def copy_escape(value) -> str:
    if value is None:
        return r"\N"
    if isinstance(value, bool):
        return "t" if value else "f"
    text = str(value)
    return (text.replace("\\", "\\\\")
                .replace("\t", "\\t")
                .replace("\n", "\\n")
                .replace("\r", "\\r"))


def copy_row(values) -> str:
    return "\t".join(copy_escape(v) for v in values) + "\n"


# ---------------------------------------------------------------- veritabanı


def read_connection_string() -> str:
    """Bağlantı dizesi: önce DATABASE_CONNECTION, sonra appsettings dosyaları."""
    override = os.environ.get("DATABASE_CONNECTION")
    if override:
        return override

    for path in APPSETTINGS:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        connection = (data.get("ConnectionStrings") or {}).get("Default")
        if connection:
            return connection

    raise SystemExit(
        "Bağlantı dizesi bulunamadı. appsettings.Development.json içine "
        "ConnectionStrings:Default ekleyin ya da DATABASE_CONNECTION ortam değişkenini tanımlayın.")


def connection_env() -> dict:
    """Bağlantı dizesini psql ortam değişkenlerine çevirir."""
    connection = read_connection_string()

    parts = {}
    for chunk in connection.split(";"):
        if "=" in chunk:
            key, _, value = chunk.partition("=")
            parts[key.strip().lower()] = value.strip()

    env = dict(os.environ)
    env["PGHOST"] = parts.get("host", "localhost")
    env["PGPORT"] = parts.get("port", "5432")
    env["PGDATABASE"] = parts.get("database", "perfume_comparer")
    if parts.get("username"):
        env["PGUSER"] = parts["username"]
    if parts.get("password"):
        env["PGPASSWORD"] = parts["password"]
    return env


def psql_scalar(env: dict, sql: str) -> str:
    result = subprocess.run(
        ["psql", "-X", "-q", "-A", "-t", "-c", sql],
        env=env, capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"psql hatası:\n{result.stderr.strip()}")
    return result.stdout.strip()


def ensure_schema(env: dict) -> None:
    if psql_scalar(env, "select to_regclass('public.perfumes')") != "perfumes":
        raise SystemExit(
            "Şema bulunamadı. Önce API'yi bir kez çalıştırın:\n"
            "  cd src/PerfumeComparer && dotnet run --launch-profile http"
        )
    missing = psql_scalar(env, "select to_regclass('public.perfume_accords')")
    if missing != "perfume_accords":
        raise SystemExit(
            "Şema eski. Veritabanını silip API'yi yeniden çalıştırın:\n"
            "  psql -d postgres -c 'DROP DATABASE perfume_comparer WITH (FORCE);'\n"
            "  psql -d postgres -c 'CREATE DATABASE perfume_comparer;'\n"
            "  cd src/PerfumeComparer && dotnet run --launch-profile http"
        )


# ------------------------------------------------------------------- derleme


class Catalog:
    """Diskteki JSON'ları veritabanı satırlarına çevirir; id'leri kendisi dağıtır."""

    def __init__(self) -> None:
        self.brands: list[list] = []
        self.perfumes: list[list] = []
        self.notes: dict[str, dict] = {}     # slug -> {id, name, count}
        self.accords: dict[str, dict] = {}
        self.perfume_notes: list[list] = []
        self.perfume_accords: list[list] = []
        self.perfume_seasons: list[list] = []
        self.relations: list[list] = []
        self.by_key: dict[tuple[str, str], int] = {}   # (fold(marka), fold(ad)) -> perfume id
        self.pending_relations: list[tuple[int, str, list, str]] = []
        self.used_slugs: set[str] = set()
        self.skipped = Counter()

    # -- lookup tabloları

    def note_id(self, name: str) -> int:
        slug = slugify(name)
        entry = self.notes.get(slug)
        if entry is None:
            entry = {"id": len(self.notes) + 1, "name": name, "count": 0}
            self.notes[slug] = entry
        return entry["id"]

    def accord_id(self, name: str) -> int:
        slug = slugify(name)
        entry = self.accords.get(slug)
        if entry is None:
            entry = {"id": len(self.accords) + 1, "name": name, "count": 0}
            self.accords[slug] = entry
        return entry["id"]

    def unique_slug(self, base: str, fallback_id: str | None) -> str:
        slug = base
        if slug in self.used_slugs and fallback_id:
            slug = f"{base}-{fallback_id}"
        counter = 2
        while slug in self.used_slugs:
            slug = f"{base}-{counter}"
            counter += 1
        self.used_slugs.add(slug)
        return slug

    # -- ana kurulum

    def build(self, brands: list[dict]) -> None:
        for brand_index, brand in enumerate(brands, start=1):
            brand_id = brand_index
            brand_slug = slugify(brand["name"])
            count = 0

            for path, data in load_perfume_files(brand["key"]):
                if self.add_perfume(brand_id, brand["name"], brand_slug, brand["key"], path, data,
                                    brand["listing"]):
                    count += 1

            self.brands.append([
                brand_id, brand["name"], brand_slug, brand["country"], brand["description"],
                brand["logo_url"], brand["main_activity"], brand["website_url"],
                brand["parent_company"], brand["source_url"], count,
            ])

        self.resolve_relations()

    def add_perfume(self, brand_id, brand_name, brand_slug, brand_key, path, data, listing) -> bool:
        url = data.get("url")
        listed = listing.get(url, {}) if url else {}

        name = (listed.get("title") or "").strip()
        if not name:
            # Detay sayfasının başlığı "<parfüm> <marka>" biçiminde; markayı sondan at.
            raw = (data.get("name") or "").strip()
            if raw.lower().endswith(brand_name.lower()):
                raw = raw[: -len(brand_name)].strip()
            name = raw

        if not name:
            self.skipped["adsız"] += 1
            return False

        concentration = parse_concentration(name)
        conc_slug = CONCENTRATION_SLUGS.get(concentration or "", "")
        base_slug = slugify(f"{brand_slug} {name} {conc_slug}".strip())
        fragrantica_id = re.search(r"-(\d+)\.html$", url or "")
        perfume_slug = self.unique_slug(base_slug, fragrantica_id.group(1) if fragrantica_id else None)

        perfume_id = len(self.perfumes) + 1

        # Akorlar: en baskını koku ailesini belirler.
        accords = [a for a in (data.get("mainAccords") or [])
                   if a.get("name") and not is_noise_accord(a["name"])]
        for rank, accord in enumerate(accords):
            accord_name = title_tr(accord["name"].strip())
            accord_id = self.accord_id(accord_name)
            self.accords[slugify(accord_name)]["count"] += 1
            self.perfume_accords.append([
                perfume_id, accord_id, round(min(parse_decimal(accord.get("width")), 100.0), 2), rank,
            ])

        family = family_from_accord(accords[0]["name"]) if accords else None  # ham ad: eşleme küçük harfli

        # Notalar: piramit varsa katmanlı, yoksa tek düz liste (All).
        notes = data.get("notes") or {}
        seen_notes: set[tuple[int, str]] = set()
        for layer_key, layer in (("top", "Top"), ("middle", "Middle"), ("base", "Base"), ("all", "All")):
            for order, note_name in enumerate(notes.get(layer_key) or []):
                cleaned = (note_name or "").strip()
                if not cleaned:
                    continue
                note_id = self.note_id(cleaned)
                if (note_id, layer) in seen_notes:
                    continue
                seen_notes.add((note_id, layer))
                self.notes[slugify(cleaned)]["count"] += 1
                self.perfume_notes.append([perfume_id, note_id, layer, order])

        # Mevsimler: ham oy + parfümün en yüksek mevsimine göre 0-100 normalize skor.
        seasons = data.get("seasons") or {}
        season_votes = {key: parse_votes(seasons.get(key)) for key, _ in SEASON_KEYS}
        top_season = max(season_votes.values()) if season_votes else 0
        for key, value in SEASON_KEYS:
            votes = season_votes[key]
            score = round(votes * 100 / top_season) if top_season else 0
            self.perfume_seasons.append([perfume_id, value, votes, score])

        rating = data.get("rating") or {}
        breakdown = rating.get("breakdown") or {}
        longevity = data.get("longevity") or {}
        sillage = data.get("sillage") or {}
        gender_votes = data.get("genderVoting") or {}
        price = data.get("priceVoting") or {}

        image = f"perfumes/{brand_key}/images/{path.stem}.webp"
        image_url = f"/media/{image}" if (SCRAPE_DIR / image).exists() else None

        self.perfumes.append([
            perfume_id, brand_id, name, perfume_slug,
            parse_gender(listed.get("gender"), data.get("targetGender")),
            concentration, family, parse_year(listed.get("year")),
            (data.get("description") or "").strip() or None,
            image_url, url,
            round(min(parse_decimal(rating.get("score")), 5.0), 2), parse_votes(rating.get("votesCount")),
            parse_votes(breakdown.get("love")), parse_votes(breakdown.get("like")),
            parse_votes(breakdown.get("ok")), parse_votes(breakdown.get("dislike")),
            parse_votes(breakdown.get("hate")),
            0, 0,  # user_avg_rating, user_rating_count — site kullanıcıları doldurur
            parse_votes(longevity.get("veryWeak")), parse_votes(longevity.get("weak")),
            parse_votes(longevity.get("moderate")), parse_votes(longevity.get("longLasting")),
            parse_votes(longevity.get("eternal")),
            parse_votes(sillage.get("intimate")), parse_votes(sillage.get("moderate")),
            parse_votes(sillage.get("strong")), parse_votes(sillage.get("enormous")),
            parse_votes(gender_votes.get("female")), parse_votes(gender_votes.get("moreFemale")),
            parse_votes(gender_votes.get("unisex")), parse_votes(gender_votes.get("moreMale")),
            parse_votes(gender_votes.get("male")),
            parse_votes(price.get("wayOverpriced")), parse_votes(price.get("overpriced")),
            parse_votes(price.get("fair")), parse_votes(price.get("goodValue")),
            parse_votes(price.get("greatValue")),
            parse_votes((data.get("seasons") or {}).get("day")),
            parse_votes((data.get("seasons") or {}).get("night")),
            0,      # usage_count
            True,   # is_published
        ])

        self.by_key.setdefault((fold(brand_name), fold(name)), perfume_id)
        self.pending_relations.append(
            (perfume_id, "RemindsMeOf", data.get("remindsMeOf") or [], brand_name))
        self.pending_relations.append(
            (perfume_id, "PeopleAlsoLike", data.get("peopleAlsoLike") or [], brand_name))
        return True

    def resolve_relations(self) -> None:
        """Öneri listelerini (marka, ad) ile eşleştirir; veri setinde olmayanları atar."""
        seen: set[tuple[int, int, str]] = set()

        for source_id, kind, items, _ in self.pending_relations:
            order = 0
            for item in items:
                brand = (item.get("brand") or "").strip()
                name = (item.get("name") or "").strip()
                if not brand or not name:
                    continue

                target_id = self.by_key.get((fold(brand), fold(name)))
                if target_id is None:
                    self.skipped[f"{kind} eşleşmedi"] += 1
                    continue
                if target_id == source_id or (source_id, target_id, kind) in seen:
                    continue

                seen.add((source_id, target_id, kind))
                self.relations.append([source_id, target_id, kind, order])
                order += 1


# --------------------------------------------------------------------- yazma

BRAND_COLUMNS = ("id, name, slug, country, description, logo_url, main_activity, "
                 "website_url, parent_company, source_url, perfume_count")

PERFUME_COLUMNS = (
    "id, brand_id, name, slug, gender, concentration, fragrance_family, release_year, "
    "description, image_url, source_url, avg_rating, rating_count, rating_love, rating_like, "
    "rating_ok, rating_dislike, rating_hate, user_avg_rating, user_rating_count, "
    "longevity_very_weak, longevity_weak, longevity_moderate, longevity_long_lasting, "
    "longevity_eternal, sillage_intimate, sillage_moderate, sillage_strong, sillage_enormous, "
    "gender_vote_female, gender_vote_more_female, gender_vote_unisex, gender_vote_more_male, "
    "gender_vote_male, price_way_overpriced, price_overpriced, price_fair, price_good_value, "
    "price_great_value, day_votes, night_votes, usage_count, is_published"
)

SEQUENCES = ["brands", "notes", "accords", "perfumes"]


def write_sql(out, catalog: Catalog, reset: str | None) -> None:
    out.write("BEGIN;\n")

    if reset == "all":
        out.write(f"TRUNCATE {', '.join(ALL_TABLES)} RESTART IDENTITY CASCADE;\n")
    elif reset == "catalog":
        out.write(f"TRUNCATE {', '.join(CATALOG_TABLES)} RESTART IDENTITY CASCADE;\n")

    def copy(table: str, columns: str, rows) -> None:
        out.write(f"COPY {table} ({columns}) FROM STDIN;\n")
        for row in rows:
            out.write(copy_row(row))
        out.write("\\.\n")

    copy("brands", BRAND_COLUMNS, catalog.brands)
    copy("notes", "id, name, slug, perfume_count",
         ([e["id"], e["name"], slug, e["count"]] for slug, e in catalog.notes.items()))
    copy("accords", "id, name, slug, perfume_count",
         ([e["id"], e["name"], slug, e["count"]] for slug, e in catalog.accords.items()))
    copy("perfumes", PERFUME_COLUMNS, catalog.perfumes)
    copy("perfume_notes", "perfume_id, note_id, layer, sort_order", catalog.perfume_notes)
    copy("perfume_accords", "perfume_id, accord_id, width, rank", catalog.perfume_accords)
    copy("perfume_seasons", "perfume_id, season, votes, score", catalog.perfume_seasons)
    copy("perfume_alternatives", "source_perfume_id, target_perfume_id, kind, sort_order",
         catalog.relations)

    # Id'leri script dağıttığı için dizileri elle ileri sar.
    for table in SEQUENCES:
        out.write(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {table}), 1));\n")

    out.write("COMMIT;\n")


# ---------------------------------------------------------------------- ana


def main() -> int:
    parser = argparse.ArgumentParser(
        description="scrape_files verisini Postgres'e aktarır.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    parser.add_argument("--reset", action="store_true",
                        help="Katalogu (marka, parfüm, nota, akor) uçurup baştan basar. "
                             "Parfüme bağlı yorum, puan ve favoriler de silinir.")
    parser.add_argument("--reset-all", action="store_true",
                        help="Kullanıcı ve blog dahil bütün tabloları uçurur.")
    parser.add_argument("--brands", help="Sadece bu markalar (virgülle): chanel,dior")
    parser.add_argument("--limit", type=int, help="İlk N markayı aktar (deneme için).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Veritabanına hiçbir şey yazmaz, sadece ne olacağını raporlar.")
    parser.add_argument("--sql-out", help="SQL'i çalıştırmak yerine bu dosyaya yazar.")
    args = parser.parse_args()

    if not BRANDS_DIR.is_dir() or not PERFUMES_DIR.is_dir():
        raise SystemExit(f"scrape_files bulunamadı: {SCRAPE_DIR}")

    selected = [b.strip() for b in args.brands.split(",")] if args.brands else None

    print("Marka dosyaları okunuyor...")
    brands = load_brands(selected, args.limit)
    if not brands:
        raise SystemExit("Aktarılacak marka bulunamadı.")

    print(f"{len(brands)} marka bulundu, parfümler işleniyor...")
    catalog = Catalog()
    catalog.build(brands)

    print(f"  marka        : {len(catalog.brands)}")
    print(f"  parfüm       : {len(catalog.perfumes)}")
    print(f"  nota         : {len(catalog.notes)}")
    print(f"  akor         : {len(catalog.accords)}")
    print(f"  parfüm-nota  : {len(catalog.perfume_notes)}")
    print(f"  parfüm-akor  : {len(catalog.perfume_accords)}")
    print(f"  benzerlik    : {len(catalog.relations)}")
    for reason, count in catalog.skipped.most_common():
        print(f"  atlandı ({reason}): {count}")

    reset = "all" if args.reset_all else ("catalog" if args.reset else None)

    if args.sql_out:
        with open(args.sql_out, "w", encoding="utf-8") as handle:
            write_sql(handle, catalog, reset)
        print(f"SQL yazıldı: {args.sql_out}")
        return 0

    if args.dry_run:
        print("--dry-run: veritabanına yazılmadı.")
        return 0

    env = connection_env()
    ensure_schema(env)

    existing = int(psql_scalar(env, "select count(*) from perfumes") or 0)
    if existing and not reset:
        raise SystemExit(
            f"Veritabanında zaten {existing} parfüm var. Üzerine yazmak için --reset kullanın:\n"
            "  python3 scripts/import_data.py --reset")

    print("Veritabanına yazılıyor..." + (" (önce mevcut veri siliniyor)" if reset else ""))
    process = subprocess.Popen(
        ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"],
        env=env, stdin=subprocess.PIPE, text=True, encoding="utf-8")
    write_sql(process.stdin, catalog, reset)
    process.stdin.close()

    if process.wait() != 0:
        raise SystemExit("İçe aktarım başarısız oldu; hiçbir değişiklik kaydedilmedi.")

    print(f"Bitti. {len(catalog.perfumes)} parfüm, {len(catalog.brands)} marka aktarıldı.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
