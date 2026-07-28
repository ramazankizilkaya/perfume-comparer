import json
import time
import sys
import os

# Ensure current directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from scrape_designer import scrape_designer

def batch_scrape(urls_file="popular_designer_urls_tr.json", delay=1):
    if not os.path.exists(urls_file):
        print(f"Error: {urls_file} not found. Run generate_designer_urls.py first.")
        return

    with open(urls_file, "r", encoding="utf-8") as f:
        urls = json.load(f)

    print(f"Loaded {len(urls)} URLs from {urls_file}")
    out_dir = "scrape_files/brands"
    os.makedirs(out_dir, exist_ok=True)

    success_count = 0
    skip_count = 0
    fail_count = 0

    for idx, url in enumerate(urls, 1):
        lang_suffix = "tr" if ".tr/" in url else "en"
        brand_slug = url.split('/')[-1].replace('.html', '').lower().replace('-', '_')
        out_filename = os.path.join(out_dir, f"{brand_slug}_fragrantica_{lang_suffix}.json")

        if os.path.exists(out_filename):
            print(f"[{idx}/{len(urls)}] Skipping (already exists): {out_filename}")
            skip_count += 1
            continue

        print(f"[{idx}/{len(urls)}] Scraping {url}...")
        try:
            result = scrape_designer(url)
            if result:
                with open(out_filename, "w", encoding="utf-8") as out_f:
                    json.dump(result, out_f, ensure_ascii=False, indent=2)
                print(f"  --> Saved: {result['title']} ({result['totalPerfumes']} perfumes) -> {out_filename}")
                success_count += 1
            else:
                print(f"  --> Failed to extract data for {url}")
                fail_count += 1
        except Exception as e:
            print(f"  --> Error for {url}: {e}")
            fail_count += 1

        time.sleep(delay)

    print(f"\nCompleted! Total: {len(urls)}, Saved: {success_count}, Skipped: {skip_count}, Failed: {fail_count}")

if __name__ == "__main__":
    file_to_run = sys.argv[1] if len(sys.argv) > 1 else "popular_designer_urls_tr.json"
    batch_scrape(file_to_run)
