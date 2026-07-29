import json
import time
import sys
import os

# Ensure current directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from scrape_brands import batch_scrape_brands, get_popular_designer_urls, collect_all_designer_urls

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        urls = collect_all_designer_urls(lang="tr")
        batch_scrape_brands(urls)
    elif len(sys.argv) > 1 and sys.argv[1].endswith(".json"):
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            urls = json.load(f)
        batch_scrape_brands(urls)
    else:
        batch_scrape_brands()
