"""
Scriptlerin backend ayarlarını okuduğu tek yer.

Sırlar backend'in `appsettings.Local.json` dosyasında durur (.gitignore'lu);
scriptler de aynı dosyayı okur ki anahtar iki yerde tutulmasın. Ortam
değişkeni tanımlıysa o kazanır, böylece CI ve üretimde dosya gerekmez.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

API_DIR = Path(__file__).resolve().parent.parent / "src" / "PerfumeComparer"

# Öncelik sırası: yerel sırlar, sonra ortama göre ayarlar, sonra taban ayarlar.
APPSETTINGS_FILES = [
    API_DIR / "appsettings.Local.json",
    API_DIR / "appsettings.Development.json",
    API_DIR / "appsettings.json",
]


def setting(path: str, env_var: str | None = None, default: Any = None) -> Any:
    """
    "Gemini:ApiKey" gibi bir yolu appsettings dosyalarında arar.

    `env_var` verilirse önce ona bakar; dolu bir ortam değişkeni her zaman
    dosyadaki değeri ezer.
    """
    if env_var:
        value = os.environ.get(env_var)
        if value:
            return value

    keys = path.split(":")

    for file in APPSETTINGS_FILES:
        if not file.is_file():
            continue

        try:
            node: Any = json.loads(file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue

        for key in keys:
            if not isinstance(node, dict) or key not in node:
                node = None
                break
            node = node[key]

        if node not in (None, ""):
            return node

    return default


def gemini_api_key() -> str:
    """Scraper'ların kullandığı Gemini anahtarı. Yoksa boş döner ve AI adımı atlanır."""
    return setting("Gemini:ApiKey", env_var="GEMINI_API_KEY", default="") or ""
