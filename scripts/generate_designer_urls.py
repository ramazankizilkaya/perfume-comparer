import json
import os
from playwright.sync_api import sync_playwright

POPULAR_BRANDS_HTML_SNIPPET = [
    "https://www.fragrantica.com/designers/Lattafa-Perfumes.html",
    "https://www.fragrantica.com/designers/Dior.html",
    "https://www.fragrantica.com/designers/Yves-Saint-Laurent.html",
    "https://www.fragrantica.com/designers/Guerlain.html",
    "https://www.fragrantica.com/designers/Giorgio-Armani.html",
    "https://www.fragrantica.com/designers/Tom-Ford.html",
    "https://www.fragrantica.com/designers/French-Avenue.html",
    "https://www.fragrantica.com/designers/Jean-Paul-Gaultier.html",
    "https://www.fragrantica.com/designers/Armaf.html",
    "https://www.fragrantica.com/designers/Chanel.html",
    "https://www.fragrantica.com/designers/Amouage.html",
    "https://www.fragrantica.com/designers/Zara.html",
    "https://www.fragrantica.com/designers/Xerjoff.html",
    "https://www.fragrantica.com/designers/Parfums-de-Marly.html",
    "https://www.fragrantica.com/designers/Versace.html",
    "https://www.fragrantica.com/designers/Dolce-Gabbana.html",
    "https://www.fragrantica.com/designers/Afnan.html",
    "https://www.fragrantica.com/designers/Maison-Alhambra.html",
    "https://www.fragrantica.com/designers/Louis-Vuitton.html",
    "https://www.fragrantica.com/designers/PARIS-CORNER.html",
    "https://www.fragrantica.com/designers/By-Kilian.html",
    "https://www.fragrantica.com/designers/Maison-Martin-Margiela.html",
    "https://www.fragrantica.com/designers/Rabanne.html",
    "https://www.fragrantica.com/designers/Carolina-Herrera.html",
    "https://www.fragrantica.com/designers/Byredo.html",
    "https://www.fragrantica.com/designers/Diptyque.html",
    "https://www.fragrantica.com/designers/Valentino.html",
    "https://www.fragrantica.com/designers/Creed.html",
    "https://www.fragrantica.com/designers/Mancera.html",
    "https://www.fragrantica.com/designers/Givenchy.html",
    "https://www.fragrantica.com/designers/Prada.html",
    "https://www.fragrantica.com/designers/Bath-Body-Works.html",
    "https://www.fragrantica.com/designers/Hermes.html",
    "https://www.fragrantica.com/designers/Rasasi.html",
    "https://www.fragrantica.com/designers/Maison-Francis-Kurkdjian.html",
    "https://www.fragrantica.com/designers/Natura.html",
    "https://www.fragrantica.com/designers/O-Boticario.html",
    "https://www.fragrantica.com/designers/Gucci.html",
    "https://www.fragrantica.com/designers/Jo-Malone-London.html",
    "https://www.fragrantica.com/designers/Lancome.html",
    "https://www.fragrantica.com/designers/Victoria-s-Secret.html",
    "https://www.fragrantica.com/designers/Nishane.html",
    "https://www.fragrantica.com/designers/Hugo-Boss.html",
    "https://www.fragrantica.com/designers/Mugler.html",
    "https://www.fragrantica.com/designers/Burberry.html",
    "https://www.fragrantica.com/designers/Khadlaj-Perfumes.html",
    "https://www.fragrantica.com/designers/Montale.html",
    "https://www.fragrantica.com/designers/Kayali-Fragrances.html",
    "https://www.fragrantica.com/designers/Initio-Parfums-Prives.html",
    "https://www.fragrantica.com/designers/Rayhaan.html",
    "https://www.fragrantica.com/designers/Fragrance-World.html",
    "https://www.fragrantica.com/designers/Etat-Libre-d-Orange.html",
    "https://www.fragrantica.com/designers/Penhaligon-s.html",
    "https://www.fragrantica.com/designers/Serge-Lutens.html",
    "https://www.fragrantica.com/designers/Calvin-Klein.html",
    "https://www.fragrantica.com/designers/Bvlgari.html",
    "https://www.fragrantica.com/designers/Le-Labo.html",
    "https://www.fragrantica.com/designers/Azzaro.html",
    "https://www.fragrantica.com/designers/Juliette-Has-A-Gun.html",
    "https://www.fragrantica.com/designers/Ex-Nihilo.html"
]

def collect_all_designer_urls():
    urls_en = set(POPULAR_BRANDS_HTML_SNIPPET)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print("Scanning Fragrantica designer directory pages...")
        for i in range(1, 15):
            dir_url = f"https://www.fragrantica.com/designers-{i}/"
            try:
                response = page.goto(dir_url, wait_until="domcontentloaded", timeout=10000)
                if response and response.status == 200:
                    page.wait_for_timeout(1000)
                    found = page.evaluate("""() => {
                        return Array.from(document.querySelectorAll('a[href*="/designers/"]'))
                            .map(a => a.href)
                            .filter(h => h.endsWith('.html') && !h.endsWith('/designers/'));
                    }""")
                    prev_count = len(urls_en)
                    for u in found:
                        urls_en.add(u)
                    print(f"Page {dir_url}: Found {len(found)} links. Total unique: {len(urls_en)}")
                    if len(urls_en) == prev_count and i > 3:
                        break
            except Exception as e:
                print(f"Finished scanning at page {i}: {e}")
                break

        browser.close()

    sorted_urls_en = sorted(list(urls_en))
    sorted_urls_tr = [u.replace("www.fragrantica.com", "www.fragrantica.tr") for u in sorted_urls_en]
    popular_tr = [u.replace("www.fragrantica.com", "www.fragrantica.tr") for u in POPULAR_BRANDS_HTML_SNIPPET]

    # Save English files
    with open("popular_designer_urls.json", "w", encoding="utf-8") as f:
        json.dump(POPULAR_BRANDS_HTML_SNIPPET, f, ensure_ascii=False, indent=2)
    with open("designer_urls.json", "w", encoding="utf-8") as f:
        json.dump(sorted_urls_en, f, ensure_ascii=False, indent=2)
    with open("designer_urls.txt", "w", encoding="utf-8") as f:
        for url in sorted_urls_en:
            f.write(url + "\n")

    # Save Turkish files
    with open("popular_designer_urls_tr.json", "w", encoding="utf-8") as f:
        json.dump(popular_tr, f, ensure_ascii=False, indent=2)
    with open("designer_urls_tr.json", "w", encoding="utf-8") as f:
        json.dump(sorted_urls_tr, f, ensure_ascii=False, indent=2)
    with open("designer_urls_tr.txt", "w", encoding="utf-8") as f:
        for url in sorted_urls_tr:
            f.write(url + "\n")

    print(f"\n[EN] Saved {len(POPULAR_BRANDS_HTML_SNIPPET)} popular URLs to popular_designer_urls.json")
    print(f"[EN] Saved {len(sorted_urls_en)} valid URLs to designer_urls.json & designer_urls.txt")
    print(f"\n[TR] Saved {len(popular_tr)} popular TR URLs to popular_designer_urls_tr.json")
    print(f"[TR] Saved {len(sorted_urls_tr)} valid TR URLs to designer_urls_tr.json & designer_urls_tr.txt")

if __name__ == "__main__":
    collect_all_designer_urls()
