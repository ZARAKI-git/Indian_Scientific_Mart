# Indian Scientific Mart — catalogue site

Quotation-only lab-supply catalogue for Indian Scientific Mart (Cuttack, Odisha).
Customers browse brands → search a maker's price list → add items to a quote list →
send it. The office replies with a price offline. **No cart checkout, no payments.**

- **Design source of truth:** `design/index-reference.html` (the approved "Sky Bench" page).
  Its CSS is ported verbatim to `app/styles/reference.css`; new pages only add
  `app/styles/catalogue.css`, built from the same tokens.
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · GSAP 3.13
  (Observer, ScrollTrigger, SplitText) · Supabase (Postgres + Auth) · TanStack Virtual.
- **Data:** 103k products from 29 supplier price lists, produced by the Python
  pipeline in `scripts/ingest` (see `docs/ingestion-report.md`).

## Run locally

```bash
pnpm install
cp .env.example .env.local      # fill in the Supabase keys (see below)
pnpm dev                        # http://localhost:3000
pnpm build && pnpm start        # production build
```

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public catalogue reads (RLS-restricted) and admin sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**: writing quote requests, the ingestion loader, refreshing brand counts |
| `QUOTE_NOTIFIER` | `log` (default) or `email` |
| `RESEND_API_KEY`, `QUOTE_NOTIFY_TO`, `QUOTE_NOTIFY_FROM` | email delivery of new quote requests (Resend) |
| `NEXT_PUBLIC_SITE_URL` | canonical URLs, sitemap, JSON-LD |
| `NEXT_PUBLIC_SITE_LIVE` | `true` lets search engines index the site. Leave `false` until the client confirms address/phone/IndiaMART URL |
| `REVALIDATE_SECRET` | lets the loader purge the site's cached catalogue reads after a load |

## Database

Migrations are in `supabase/migrations` (already applied to project
`qcksvwradejlzhnulvdp`, region ap-south-1). Apply to a fresh project in order:

```bash
supabase db push            # or paste each file into the SQL editor
```

Row-level security: the public can read only active, reviewed products of active
brands. Quote requests are written by the server with the service role and are
readable only by admins. Every admin write is checked by `is_admin()`.

### Create an admin

1. Supabase dashboard → Authentication → Users → *Add user* (email + password).
2. SQL editor: `insert into admin_users (user_id) select id from auth.users where email = 'office@example.com';`
3. Sign in at `/admin/login`.

## Ingestion pipeline (`scripts/ingest`)

```bash
cd scripts/ingest
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
brew install tesseract                       # OCR for the scanned lists (Tier C)

# 1. parse every supplier file into a reviewable set (re-runnable)
.venv/bin/python -m ism_ingest --src ~/Downloads/INDIAN_SCIENTIFIC_MART --out out
#    → out/products.jsonl, out/products.csv, out/report.md, out/report.json
#    one brand only:  --only merck borosil

# 2. load into Supabase (idempotent upsert on brand + code)
.venv/bin/python -m ism_ingest.load --in out
```

From the project root: `ISM_SOURCE_DIR=… pnpm ingest` and `pnpm ingest:load`.

What the pipeline does:
- **Dedupe:** every file is SHA-256 hashed; byte-identical uploads (the two DXBIDT and
  two REMI files) are parsed once. Content duplicates that are not byte-identical
  (NICE `.xls`/`.pdf` = `.xlsx`) are declared in `sources.py` and listed in the report.
  The Cytiva PDF is parsed as a *supplement*: it only adds codes the Whatman
  spreadsheet lacks.
- **Normalise:** pack sizes (`2,5 L` → `2.5 l`), GST to integer % (Whatman's `0.18` → 18),
  Indian number formats (`1,29,500.00`), POR/On-Request.
- **Categorise** into one cross-brand taxonomy (`taxonomy.py`, per-brand rules).
- **Price basis** per brand, with the sentence from the list that proves it
  (`basis_evidence` in `sources.py`). Default `unknown`, shown on the site.
- **Tier C (scanned):** Ambassador/BP and Ambey Labs are OCR'd with Tesseract.
  Every row is `needs_review`, and both brands stay inactive until reviewed in `/admin/review`.
- **Idempotent load:** upsert on `(brand_id, code)`. Rows that disappear from a list are
  deactivated, not deleted. Admin edits to list rate / live / POR / images, and
  review approvals, survive re-runs.
- **Report:** per brand, rows kept, flagged, skipped (with reasons), and duplicate codes.

### Add a new brand

1. Write a parser: a class implementing `BrandParser.parse(path)` that yields `RawProduct`
   (or `Skip` with a reason), registered with `@register("key")`, in any module under
   `ism_ingest/parsers/`. Reuse the helpers instead of starting from raw text:
   - `layout.iter_rows` / `styled_rows`: rows and cells rebuilt from word positions (with font weight/size)
   - `Columns` + `table_records`: code-led tables with wrapped descriptions
   - `SpecTableParser` + `SpecTableConfig`: bold headings followed by spec tables (Borosil/OMSONS style)
2. Add a `Brand(...)` entry to `ism_ingest/sources.py` (files, parser key, price basis + evidence, list date).
3. Optionally add category rules for it in `taxonomy.py`.
4. Check a few pages: `.venv/bin/python -m ism_ingest.debug <key> <file.pdf> 10-12`.

No other module changes. The pipeline discovers parsers through the registry.

## Architecture

```
app/                      routes (home = fullpage engine; everything else natural scroll)
  (site)/catalogue, brands, brands/[slug], products/[id], quote
  admin/                  auth-gated: products, review queue, quotes, brands & categories
  actions/quote.ts        server action: validate → QuoteRepository → QuoteNotifier
  api/products            paged search for the virtualised list
components/
  home/                   scene engine + one component per reference scene
  catalogue/ product/ quote/ brands/ admin/ layout/ ui/ motion/
lib/
  domain/types.ts         shared shapes, no I/O
  repositories/           contracts.ts (interfaces) + supabase/ (the only DB code) + index.ts (composition root)
  motion/                 env tiers, MotionProvider, primitives (splitHeading, revealOnEnter,
                          tiltCard, parallaxLayer, pointerParallax, progressLine, autoAdvance, staggerIn)
  quote/                  cart store (localStorage, try/catch) + notifier/ (QuoteNotifier: Email, Log)
scripts/ingest/           Python pipeline (BrandParser registry, OCR, loader)
qa/verify.mjs             headless-Chrome verification
```

- **Home engine** (`components/home/HomeEngine.tsx`) is the reference's fullpage engine,
  home only. Scenes know nothing about it: it dispatches `scene:enter` / `scene:leave`
  on the scene element, and each scene listens for itself.
- **Capability tiers** (`lib/motion/env.ts`): reduced motion → no animation, no fullpage;
  touch or ≤4 cores/≤4 GB → fades only (no tilt, parallax, line masks).
- **No-JS / blocked bundle:** an inline boot script adds `.js` (as the reference does) and
  removes it after 4 s if the motion bundle never reports in, so the page falls back
  to a plain, fully visible site.
- **Big lists:** search runs in Postgres (`search_products`: prefix full-text over
  name/code/CAS + code prefix, ranked), 50 rows per request, rendered through a window
  virtualiser. Plain prev/next links remain for crawlers and no-JS visitors.
- **Quote delivery** sits behind `QuoteNotifier` (`lib/quote/notifier`). Email via Resend
  now; a WhatsApp notifier is one new class + one `case` in `index.ts`.
- **Images:** `products.image_url` takes a real photo whenever one exists (served through
  `next/image`: AVIF/WebP, srcset, lazy, blur-up). Otherwise the row shows a category
  placeholder. Banners use the reference's Unsplash set with width-appropriate srcsets.

## Verify

```bash
pnpm build && PORT=3100 pnpm start &
npm i --no-save puppeteer-core@24.25.0
node qa/verify.mjs http://localhost:3100
```

Checks: no horizontal scroll at 1440/1100/980/640/375 on every page type, no console
errors, fullpage only on home desktop, reduced-motion and blocked-bundle fallbacks,
low-end tier disables tilt, and the quote-list flow and validation.

## Deploy (Vercel)

1. `vercel link`, then add the env vars above (service-role key as a *sensitive*
   server variable; never `NEXT_PUBLIC_`).
2. Set the function region to `bom1` (Mumbai) next to the Supabase project.
3. `vercel --prod`. Catalogue reads are cached for 5 minutes and tagged; admin edits
   and `ingest:load` (with `REVALIDATE_SECRET` + `NEXT_PUBLIC_SITE_URL`) purge them at once.

## Open items (waiting on the client)

- Street address, phone and IndiaMART URL stay as "to confirm" flags, as in the reference.
  The GST certificate in the source folder does contain the registered address, but nothing
  goes live without the client's confirmation.
- `PRICE_LIST 2026-27 PDF.pdf` names no maker: loaded under "(Unconfirmed brand)", inactive.
- Ambassador/BP Industries and Ambey Labs: OCR rows await review; both brands are off.
  Ambey's catalogue has no prices, so its rows are price-on-request.
- Quote delivery channel: `QUOTE_NOTIFIER=email` once ISM confirms the inbox; WhatsApp later if wanted.
- Stale lists are flagged on the site: Adarsh (2019) and NICE glassware (2025-26).
