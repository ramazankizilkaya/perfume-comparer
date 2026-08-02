# AGENTS.md

## Purpose
Minimum context an AI coding agent needs to work in this repo.

Project: **Aura Compare** — a Turkish perfume comparison site built on scraped Fragrantica TR data.
Goal: keep the implementation simple, extensible and clean (SoC, no spaghetti).

## Response Style (non-negotiable)
- Keep all answers to **3 sentences or fewer**. Be direct, no long explanations.
- After the short answer, stop and **ask permission before giving any further explanation**.
- End the answer with a caveman summary: (1) what the issue is, (2) what fix was applied, (3) how it behaves now.
- Reply in whatever language the user writes in.
- Write complete, grammatically correct sentences with a clear subject, verb and object. Do not use fragmented, telegraphic or note-style phrasing.
- Use plain, simple language. Avoid jargon. If a technical term is unavoidable, explain it in one short phrase.
- Explain things so a non-expert can understand. If the user cannot understand the answer, the work cannot continue.

## Agent Rules (non-negotiable)
- **ASK-FIRST RULE:** never make any change without asking first. No code modifications or destructive actions without explicit approval.
- **ADVISE-FIRST RULE:** a reported issue does not automatically mean a fix is needed. Read the code, diagnose, advise. Prefer pointing the user to the fix so they can solve it themselves. The more you touch code, the sooner it breaks.
- **COMMIT RULE:** never `git commit` / `git push` without direct permission.
- **CLEANUP RULE:** leave no temp files, debug scripts, or screenshots behind.
- **TESTING RULE:** once a change is approved and applied, verify it — run the affected script or page. Before committing, always run `npm run build` in the frontend.

## Product Summary
- Users browse, search and compare perfumes: notes, accords, ratings, longevity, sillage, season/time-of-day voting.
- Data comes from scraping Fragrantica TR (`scripts/scrape_perfumes.py`), lands as per-perfume JSON + WebP images under `scrape_files/`, and is seeded into Postgres by the .NET API on startup.
- Key routes: `/` home, `/ara` search, `/parfum/...` detail, `/karsilastir` compare, `/blog`, `/admin`, `/giris` login.

## Design Direction (important)
The UI must read like an **information portal — epey.com is the reference**: dense, tabular, sans-serif, spec-sheet oriented, lots of comparable numbers per screen.
It must NOT look like an editorial magazine: no oversized hero imagery, no long-form prose layouts, no decorative whitespace.

## Tech Stack
- Backend: .NET, EF Core, Postgres. Layered: `Controllers/` → `Business/Services` → `Data/` (`Repository`, `UnitOfWork`), entities in `Domain/Entities`.
- Frontend: Next.js App Router + TypeScript + React.
- DB: Postgres `perfume_comparer` @ localhost:5432.
- Scrapers: Python 3 + Playwright (Chromium). Validator: Node + Joi.

## Repository Layout
- `src/PerfumeComparer/` — .NET API
  - `Data/SeedService.cs` — reads `scrape_files/` and seeds the DB
  - `Controllers/` — Catalog, Search, Compare, Blog, Auth, Admin
- `src/perfume-comparer-web/` — Next.js client
- `scripts/`
  - `scrape_brands.py` — brand listings
  - `scrape_perfumes.py` — perfume detail scraper (rate-limit aware)
  - `validate_perfumes.js` — Joi schema validation over scraped JSON
  - `rephrase_descriptions.js`
- `scrape_files/brands/*.json` — brand → perfume URL lists
- `scrape_files/perfumes/<brand>/` — `<perfume>.json`, `images/<perfume>.webp`, `report.txt`
- `docs/` — roadmaps, design samples, outline

## Run Commands
```bash
./start.sh          # backend :5026 + frontend :3000, Ctrl+C stops both
```

Separately:
```bash
cd src/PerfumeComparer && dotnet run --launch-profile http     # :5026
cd src/perfume-comparer-web && npm run dev                     # :3000
cd src/perfume-comparer-web && npm run build && npm run lint
```

Scraping / data:
```bash
python3 scripts/scrape_perfumes.py                 # every brand (long!)
python3 scripts/scrape_perfumes.py afnan           # one brand
python3 scripts/scrape_perfumes.py afnan 10        # one brand, first 10
python3 scripts/scrape_perfumes.py --check-proxy   # test VPN + SOCKS5 credentials
node scripts/validate_perfumes.js                  # validate all scraped JSON
node scripts/validate_perfumes.js afnan            # validate one brand
```

## Scraper Anti-Blocking Design
Fragrantica returns HTTP 400 when it rate-limits an IP. After **3 consecutive** 400/403/429 the scraper escalates:
1. Reconnects NordVPN via the `nordvpn://connect` deeplink (the macOS app has no CLI; the deeplink ignores `country`, so it always lands on a Turkish server).
2. If VPN rotation stops helping (default 2 attempts, `SCRAPER_VPN_MAX_ATTEMPTS`), it switches to Nord's SOCKS5 endpoints, moving to the next endpoint on each further block.
3. If neither works, it falls back to an escalating 20→60s cooldown.

Chromium cannot authenticate to SOCKS5, so `NordSocksRelay` runs a local unauthenticated SOCKS5 endpoint that forwards to Nord with RFC 1929 auth. Do not "simplify" this away.

Env vars:
- `SCRAPER_VPN_ROTATE=0` — disable VPN rotation entirely
- `SCRAPER_VPN_MAX_ATTEMPTS` — VPN attempts before switching to SOCKS5 (default 2)
- `NORD_SERVICE_USER` / `NORD_SERVICE_PASS` — Nord **service credentials** (not the account password; from nordaccount.com → NordVPN → Manual setup). Without them tier 2 is skipped.

Scraping is resumable: existing valid JSON files are skipped, and `report.txt` per brand records totals and failures.

## Scraped Perfume JSON Shape
`name`, `targetGender`, `image`, `url`, `brand`, `description`, `mainAccords[{name,width}]`,
`rating{score,votesCount,breakdown}`, `seasons`, `notes{top,middle,base,all}`,
`longevity`, `sillage`, `genderVoting`, `priceVoting`, `remindsMeOf[]`, `peopleAlsoLike[]`.

`notes`: perfumes whose brand published a pyramid fill `top`/`middle`/`base`; perfumes without one get a single flat, vote-ordered list in `all` (~32% of the dataset). Handle both.

Any change to this shape must be mirrored in `scripts/validate_perfumes.js` and the frontend types.

## Agent Guardrails
- **"Mock data" always means seeding the real Postgres DB through `SeedService` — never a fake data layer in the frontend.**
- Preserve separation of concerns: controllers stay thin, business logic in `Business/Services`, data access via `Repository`/`UnitOfWork`. No EF queries inside controllers.
- Prefer small, focused edits over broad rewrites.
- Do not change API response shapes or the scraped JSON schema unless explicitly asked.
- Never kick off a full re-scrape without asking — it runs for hours against a third-party site.
- Keep user-facing copy Turkish.
- Respect the epey.com-style dense/tabular design direction in every UI change.

## Known Gotchas
- Stale `src/perfume-comparer-web/.next` cache produces phantom 404s — delete it and restart.
- `dotnet` build output (`src/PerfumeComparer/obj`, `bin`) shows up as git noise.
- `scrape_files/validation_report.json` is regenerated by the validator — don't hand-edit.
- Passing a perfume limit (`scrape_perfumes.py <brand> <n>`) rewrites that brand's `report.txt` as if the brand only had `n` perfumes.
- This Python install has no CA roots, so scraper HTTPS helpers fall back to unverified SSL contexts.

## Definition of Done
1. Backend builds and runs (`dotnet run --launch-profile http`).
2. Frontend builds (`npm run build`) and lints (`npm run lint`).
3. If scraped JSON changed, `node scripts/validate_perfumes.js` passes.
4. No regressions on detail (`/parfum/...`), search (`/ara`), compare (`/karsilastir`).
5. Workspace clean — no leftover temp/debug files.

## Prompt Templates

### 1) Fix a bug
```text
You are working on perfume-comparer (Aura Compare).
Bug: <issue + exact file + repro>.
Diagnose first, advise before changing anything.
Constraints: minimal changes, preserve API + JSON shapes.
Return: root cause, files changed, verification result. Keep it under 3 sentences + caveman summary.
```

### 2) Backend feature (.NET)
```text
Implement <feature> in src/PerfumeComparer.
Respect layering: Controller -> Business/Services -> Data/Repository. No EF in controllers.
Do not change existing response shapes unless stated.
Return the endpoint signature and a sample response.
```

### 3) Frontend feature (Next.js)
```text
Implement <feature> in src/perfume-comparer-web.
Design must stay epey.com-like: dense, tabular, sans-serif, spec-sheet. Not editorial.
Turkish copy. Do not break /ara, /parfum/..., /karsilastir.
Run npm run build before finishing.
```

### 4) Scraper work
```text
Modify scripts/scrape_perfumes.py for <goal>.
Preserve the 400-handling escalation (VPN rotation -> SOCKS5 relay -> cooldown) and resumability.
Test on ONE brand with a small limit. Do not launch a full re-scrape.
```
