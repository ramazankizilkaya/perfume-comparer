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
- Data comes from scraping Fragrantica TR (`scripts/scrape_perfumes.py`), lands as per-perfume JSON + WebP images under `scrape_files/`, and is loaded into Postgres by `scripts/import_data.py`. There is **no mock catalog**: every brand and perfume in the DB comes from `scrape_files/`.
- Key routes: `/` home, `/ara` search, `/marka` brand index, `/marka/<slug>` brand page, `/parfum/...` detail, `/karsilastir` compare, `/blog`, `/admin`, `/giris` login.

## Design Direction (important)
The UI must read like an **information portal — epey.com is the reference**: dense, tabular, sans-serif, spec-sheet oriented, lots of comparable numbers per screen.
It must NOT look like an editorial magazine: no oversized hero imagery, no long-form prose layouts, no decorative whitespace.

### UI change checklist (non-negotiable)
Every UI change must be verified in all four of these before it is called done:
1. **Desktop** (1440px) — the layout it was designed for.
2. **Mobile responsiveness** — 375px and 768px. Nothing may overflow horizontally,
   text must stay readable without zoom, tables and wide grids must either collapse to
   one column or scroll inside their own `overflow-x: auto` container. Never let a
   desktop-only grid or a fixed pixel width survive into the mobile breakpoint.
3. **Light mode** — the default palette.
4. **Dark mode** (`body.dark-mode`) — contrast must hold. Every colour goes through a
   token so dark mode is a token swap; never hard-code `#FFFFFF`, `#000`, or an
   `rgb(255 255 255 / …)` overlay in a component, because those do not swap and they
   are exactly what breaks dark-mode contrast.

Screenshot all four states with `/browse` before reporting a UI change as finished.

## Tech Stack
- Backend: .NET, EF Core, Postgres. Layered: `Controllers/` → `Business/Services` → `Data/` (`Repository`, `UnitOfWork`), entities in `Domain/Entities`.
- Frontend: Next.js App Router + TypeScript + React.
- DB: Postgres `perfume_comparer` @ localhost:5432.
- Scrapers: Python 3 + Playwright (Chromium). Validator: Node + Joi.

## Repository Layout
- `src/PerfumeComparer/` — .NET API
  - `Data/SeedService.cs` — sample **users, blogs and comments only** (triggered from `/admin`). It does not touch the catalog.
  - `Controllers/` — Catalog, Search, Compare, Blog, Auth, Admin
- `src/perfume-comparer-web/` — Next.js client
- `scripts/`
  - `import_data.py` — loads `scrape_files/` into Postgres (see "Data import")
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

Data import (schema must exist first — start the API once so EF creates it):
```bash
python3 scripts/import_data.py --reset            # wipe the catalog and load everything (~10 s)
python3 scripts/import_data.py --reset-all        # also wipes users, blogs and comments
python3 scripts/import_data.py --reset --limit 5  # first 5 brands only, for quick dev loops
python3 scripts/import_data.py --dry-run          # parse and report, write nothing
```
Without a reset flag the script refuses to run on a non-empty catalog, so a second
run can never duplicate the data. It writes through `psql` with `COPY`, so no extra
Python package is needed.

Scraping / data:
```bash
python3 scripts/scrape_perfumes.py                 # every brand, single worker (~30h for the full set)
python3 scripts/scrape_perfumes.py --parallel      # every brand, one worker per SOCKS5 endpoint (~4h)
python3 scripts/scrape_perfumes.py --parallel 4    # same, but 4 workers
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

Env vars (plain environment variables — see "Secrets"):
- `SCRAPER_VPN_ROTATE=0` — disable VPN rotation entirely
- `SCRAPER_VPN_MAX_ATTEMPTS` — VPN attempts before switching to SOCKS5 (default 2)
- `NORD_SERVICE_USER` / `NORD_SERVICE_PASS` — Nord **service credentials** (not the account password; from nordaccount.com → NordVPN → Manual setup). Without them tier 2 is skipped.

Scraping is resumable: existing valid JSON files are skipped, and `report.txt` per brand records totals and failures.

**Parallel mode** (`--parallel [workers]`) splits the brands round-robin across processes. Each worker gets an exclusive slice of the SOCKS5 endpoint list and opens **one relay for its whole lifetime**, reused across every brand — opening a relay per brand floods Nord's concurrent-connection limit, which makes every endpoint start failing its probe and collapses the run. Keep the relay worker-scoped. VPN rotation is disabled in parallel mode because the system VPN is global and would affect every worker at once. Without Nord credentials all workers share one IP, which hits limits much faster.

## Secrets
Secrets are split by who consumes them, and **neither file is ever committed**.

**Backend → `src/PerfumeComparer/appsettings.Local.json`** (gitignored; committed template:
`appsettings.Local.example.json`). Holds `ConnectionStrings:Default`, `Gemini:ApiKey`,
`Ai:ApiKey`, `Auth:Secret` and the AI tuning values. `Program.cs` loads it after the other
JSON files and registers `AddEnvironmentVariables()` last, so in production a real
environment variable overrides any file value and no file is needed at all.

**Frontend → root `.env`** (gitignored; template `.env.example`). Only `NEXT_PUBLIC_*`
lives here. `next.config.ts` reads the root `.env` because Next auto-loads only from its
own folder. Everything `NEXT_PUBLIC_*` ships to the browser, so it is configuration, not
a secret — never put a real key there.

**Python scripts** read the backend's file through `scripts/app_settings.py`
(`setting("Gemini:ApiKey", env_var="GEMINI_API_KEY")`), so the Gemini key is stored once.
`import_data.py` resolves the connection string the same way.

Scraper-only knobs (`NORD_SERVICE_USER`/`NORD_SERVICE_PASS`, `SCRAPER_VPN_*`) stay plain
environment variables — see "Scraper Anti-Blocking Design".

Never hard-code a key in source. Adding a backend secret means adding it to
`appsettings.Local.example.json` with a `_comment` and to your own `appsettings.Local.json`.

## Database Shape (what the import produces)
- `brands` — name, slug, country, bio, local logo path, main activity, website, parent company, perfume count.
- `perfumes` — name, slug, gender, concentration (parsed from the name, often null), fragrance family (derived from the top accord), release year, description, local image path, plus flat vote columns: rating + breakdown, longevity, sillage, gender voting, price voting, day/night.
  - `avg_rating` / `rating_count` are the **community (Fragrantica) score**; `user_avg_rating` / `user_rating_count` are our own site users'.
- `notes` and `accords` are **tables, not enums** (~1,300 notes, ~100 accords). `perfume_notes` carries the pyramid layer (`Top`/`Middle`/`Base`, or `All` when the brand published no pyramid); `perfume_accords` carries the dominance width.
- `perfume_alternatives` holds both "reminds me of" and "people also like", separated by `kind`.
- `perfume_age_groups` / `perfume_usages` are **not scraped**: they fill up from the "Bu parfümü kullanıyorum" button on the detail page (`POST /api/perfumes/{slug}/kullaniyorum`).

Images are served by the API from `scrape_files/` under `/media/...` (no copying). The
DB stores the relative path; the frontend prefixes it with `mediaUrl()` in `lib/urls.ts`.

## Scraped Perfume JSON Shape
`name`, `targetGender`, `image`, `url`, `brand`, `description`, `mainAccords[{name,width}]`,
`rating{score,votesCount,breakdown}`, `seasons`, `notes{top,middle,base,all}`,
`longevity`, `sillage`, `genderVoting`, `priceVoting`, `remindsMeOf[]`, `peopleAlsoLike[]`.

`notes`: perfumes whose brand published a pyramid fill `top`/`middle`/`base`; perfumes without one get a single flat, vote-ordered list in `all` (~32% of the dataset). Handle both.

Any change to this shape must be mirrored in `scripts/validate_perfumes.js` and the frontend types.

## Agent Guardrails
- **Never invent catalog data.** Brands and perfumes come only from `scrape_files/` via `scripts/import_data.py`. Sample users, blogs and comments may still be seeded through `SeedService` from `/admin`; never build a fake data layer in the frontend.
- The accord → fragrance family mapping exists in two places and must stay in sync: `Domain/Lookups.cs` (`FamilyFromAccord`) and `scripts/import_data.py` (`ACCORD_TO_FAMILY`). Same for `SlugHelper.Slugify` and the script's `slugify`.
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
- Re-importing renumbers perfume ids, so it cascades away comments, ratings and favourites. Re-seed them from `/admin` afterwards.
- The scraper adds files while it runs, so two imports minutes apart can report different perfume counts. That is expected.
- Passing a perfume limit (`scrape_perfumes.py <brand> <n>`) rewrites that brand's `report.txt` as if the brand only had `n` perfumes.
- This Python install has no CA roots, so scraper HTTPS helpers fall back to unverified SSL contexts.

## Definition of Done
1. Backend builds and runs (`dotnet run --launch-profile http`).
2. Frontend builds (`npm run build`) and lints (`npm run lint`).
3. If scraped JSON changed, `node scripts/validate_perfumes.js` passes.
4. If the DB schema changed, `python3 scripts/import_data.py --reset` still succeeds.
5. No regressions on detail (`/parfum/...`), search (`/ara`), brand (`/marka/...`), compare (`/karsilastir`).
6. Workspace clean — no leftover temp/debug files.

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
