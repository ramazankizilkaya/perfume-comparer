"""
Esans tipi (konsantrasyon) tek bir yerden belirlenir.

Fragrantica esans tipini ayrı bir alan olarak vermez; her esans tipi ayrı bir parfüm
sayfasıdır ve fark yalnızca ada yazılır ("Sauvage", "Sauvage Eau de Parfum",
"Sauvage Parfum"). Bu yüzden tek güvenilir kaynak parfümün adıdır. Adda bir ipucu
yoksa esans tipi BOŞ (None) kalır; asla "Edp" gibi bir varsayılan uydurulmaz.

Bu modülü scrape_perfumes.py, import_data.py, enrich_perfumes.py ve
fix_concentration.py birlikte kullanır; kuralı değiştirmek için yalnızca burayı değiştir.
"""

from __future__ import annotations

# Marka listesi dosyalarındaki başlık soneki: "Dior parfüm ve kolonya".
BRAND_TITLE_SUFFIX = "parfüm ve kolonya"

# Uzundan kısaya: "eau de parfum" testi "parfum" testinden önce gelmeli.
# Değerler src/PerfumeComparer/Domain/Enums/Concentration.cs ile aynı adlardır.
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

# Adres parçası: /parfum/erkek/<conc_slug>/<marka>/<slug>. Boş esans tipi -> parça yok.
# src/PerfumeComparer/Domain/Lookups.cs ile aynı kalmalı.
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


def parse_concentration(name: str | None) -> str | None:
    """Parfüm adından esans tipini okur; adda ipucu yoksa None döner."""
    if not name:
        return None
    lowered = f" {name.lower()} "
    for token, value in CONCENTRATION_TOKENS:
        if f" {token} " in lowered or lowered.endswith(f" {token} "):
            return value
    return None


def strip_brand_suffix(raw_name: str | None, brand_title: str | None) -> str:
    """
    Detay sayfasının başlığı "<parfüm> <marka>" biçimindedir ("Sauvage Dior").
    Markayı sondan atar ki "Atelier Cologne" gibi bir marka adı esans tipi sanılmasın.
    brand_title hem "Dior" hem "Dior parfüm ve kolonya" biçiminde gelebilir.
    """
    name = (raw_name or "").strip()
    title = (brand_title or "").strip()
    if not name or not title:
        return name

    candidates = [title]
    if title.lower().endswith(BRAND_TITLE_SUFFIX):
        candidates.append(title[: -len(BRAND_TITLE_SUFFIX)].strip())

    lowered = name.lower()
    for candidate in candidates:
        if candidate and lowered.endswith(candidate.lower()) and len(name) > len(candidate):
            return name[: -len(candidate)].strip()
    return name
