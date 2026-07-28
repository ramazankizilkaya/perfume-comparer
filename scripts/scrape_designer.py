import sys
import os
import json
import re
from playwright.sync_api import sync_playwright

def scrape_designer(designer_url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        print(f"Navigating to {designer_url}...")
        response = page.goto(designer_url, wait_until="domcontentloaded", timeout=15000)
        
        if not response or response.status != 200:
            print(f"Failed to fetch {designer_url}: status {response.status if response else 'No response'}")
            browser.close()
            return None

        page.wait_for_timeout(2500)

        # Scroll down to load lazy content/images
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
        page.wait_for_timeout(1000)

        data = page.evaluate("""() => {
            const h1 = document.querySelector('h1')?.innerText.trim() || '';
            const bioParagraphs = Array.from(document.querySelectorAll('div p, article p'))
                .map(p => p.innerText.trim())
                .filter(t => t.length > 40 && !t.includes('Ülkeler•Ana Şirketler'));

            // Extract brand metadata (Supports EN & TR labels)
            const bodyText = document.body.innerText;
            const extractMeta = (labels) => {
                const lines = bodyText.split('\\n');
                for (let line of lines) {
                    for (let label of labels) {
                        if (line.includes(label)) {
                            const parts = line.split(label);
                            if (parts.length > 1) return parts[1].trim();
                        }
                    }
                }
                return '';
            };

            const country = extractMeta(['Ülke:', 'Country:']);
            const mainActivity = extractMeta(['Ana faaliyet:', 'Main activity:']);
            const parentCompany = extractMeta(['Ana şirket:', 'Parent company:']);

            // Website link (link or bağlantı)
            const webLink = Array.from(document.querySelectorAll('a'))
                .find(a => {
                    const txt = a.innerText.trim().toLowerCase();
                    return txt === 'link' || txt === 'bağlantı' || txt.includes('official website') || txt.includes('resmi web');
                });
            const brandWebsite = webLink ? webLink.href : '';

            // Logo URL
            const logoImg = document.querySelector('img[src*="/dizajneri/"]')?.src || '';

            // Perfume links (supports both /perfume/ and /perfumes/ and a.prefumeHbox)
            const perfumeLinks = Array.from(document.querySelectorAll('a.prefumeHbox, a[href*="/perfume/"], a[href*="/perfumes/"]'));
            const perfumes = [];
            const seen = new Set();

            for (const a of perfumeLinks) {
                const url = a.href;
                if (!url.includes('/perfume/') && !url.includes('/perfumes/')) continue;
                if (seen.has(url)) continue;
                seen.add(url);

                const textLines = a.innerText.split('\\n').map(s => s.trim()).filter(Boolean);
                let gender = 'unisex';
                if (a.classList.contains('tw-listview-item-female') || a.className.includes('female')) {
                    gender = 'female';
                } else if (a.classList.contains('tw-listview-item-male') || a.className.includes('male')) {
                    gender = 'male';
                }

                // Inner text lines: [0: title, 1: brand, 2: year, 3: gender, 4: votes]
                const title = textLines[0] || '';
                const brand = textLines[1] || '';
                const year = textLines[2] || '';
                const votes = textLines[4] || (textLines[3] && !isNaN(textLines[3]) ? textLines[3] : '');
                const img = a.querySelector('img')?.src || a.querySelector('source')?.srcset?.split(' ')[0] || '';

                perfumes.push({
                    title: title,
                    brand: brand,
                    year: year,
                    gender: gender,
                    ratingVotesCount: votes,
                    url: url,
                    image: img
                });
            }

            return {
                title: h1,
                country: country,
                mainActivity: mainActivity,
                brandWebsite: brandWebsite,
                parentCompany: parentCompany,
                logoUrl: logoImg,
                bio: bioParagraphs,
                totalPerfumes: perfumes.length,
                perfumes: perfumes
            };
        }""")

        browser.close()
        return data

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.fragrantica.tr/designers/Giorgio-Armani.html"
    result = scrape_designer(url)
    if result:
        print(f"Scraped Designer ({url}): {result['title']}")
        print(f"Country: {result['country']}")
        print(f"Main activity: {result['mainActivity']}")
        print(f"Brand website: {result['brandWebsite']}")
        print(f"Parent company: {result['parentCompany']}")
        print(f"Logo URL: {result['logoUrl']}")
        print(f"Total Perfumes: {result['totalPerfumes']}")
        print(f"Bio paragraphs: {len(result['bio'])}")
        
        # Save output in scrape_files/brands/
        out_dir = "scrape_files/brands"
        os.makedirs(out_dir, exist_ok=True)
        lang_suffix = "tr" if ".tr/" in url else "en"
        brand_slug = url.split('/')[-1].replace('.html', '').lower().replace('-', '_')
        out_filename = os.path.join(out_dir, f"{brand_slug}_fragrantica_{lang_suffix}.json")
        
        with open(out_filename, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"Successfully saved data to {out_filename}")
