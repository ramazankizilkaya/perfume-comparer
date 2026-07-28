import os
import json
import io
import ssl
import urllib.request
from PIL import Image

def download_brand_logos(brands_dir="scrape_files/brands", output_dir="scrape_files/brand_images"):
    if not os.path.exists(brands_dir):
        print(f"Error: Directory '{brands_dir}' does not exist.")
        return

    os.makedirs(output_dir, exist_ok=True)
    
    brand_files = [f for f in sorted(os.listdir(brands_dir)) if f.endswith(".json")]
    print(f"Found {len(brand_files)} brand files in {brands_dir}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    # SSL context bypass for macOS certificate issue
    ssl_context = ssl._create_unverified_context()

    downloaded_count = 0
    skipped_count = 0
    failed_count = 0

    for filename in brand_files:
        filepath = os.path.join(brands_dir, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            logo_url = data.get("logoUrl", "").strip()
            if not logo_url:
                print(f"[-] {filename}: logoUrl is empty")
                continue

            # Standardize brand slug name
            brand_slug = filename.replace("_fragrantica_tr.json", "").replace("_fragrantica.json", "").replace("_fragrantica_en.json", "")
            output_webp_path = os.path.join(output_dir, f"{brand_slug}.webp")

            # Check if file already exists
            if os.path.exists(output_webp_path) and os.path.getsize(output_webp_path) > 0:
                print(f"[SKIP] Already exists: {output_webp_path}")
                skipped_count += 1
                continue

            print(f"[DOWNLOADING] {brand_slug} -> {logo_url}")
            req = urllib.request.Request(logo_url, headers=headers)
            with urllib.request.urlopen(req, context=ssl_context, timeout=15) as resp:
                image_bytes = resp.read()

            # Convert to WebP using Pillow
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
            print(f"  --> Saved: {output_webp_path}")
            downloaded_count += 1

        except Exception as e:
            print(f"[ERROR] Failed for {filename} ({logo_url}): {e}")
            failed_count += 1

    print(f"\nCompleted! Downloaded & Converted: {downloaded_count}, Skipped (Already Existed): {skipped_count}, Failed: {failed_count}")

if __name__ == "__main__":
    download_brand_logos()
