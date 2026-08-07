# PeggyBank — Brand-Logo System: Capability & Architecture Research

**Status:** RESEARCH ONLY. No implementation, no dependencies, no schema changes,
no downloads. Nothing here has been built.
**Backup:** branch `feature/three-tab-camera-profile` @ `e9c0e9b` →
`backup/pre-brand-logo-system-20260807` + tag `pre-brand-logo-system-20260807`
(both pushed to origin, confirmed).
**Date:** 2026-08-07. Provider terms/pricing below must be re-verified at build time.

---

## Executive summary

Automatically showing real brand logos (CIBC, Bell, Tim Hortons, Netflix…) for
bills/subscriptions/debts/expenses/OCR results is **feasible and mostly SMALL–MEDIUM
work** — it is **not** a large backend project. The hard parts are curation, legal
ToS verification, and false-positive prevention, not engineering.

The critical insight: **every serious logo API is keyed by DOMAIN** (`bell.ca`,
`cibc.com`), not by free text. So the real product is a **local brand manifest**
(name/alias → domain + metadata) plus a **resolver** that turns messy merchant
strings into a `brand_id`/domain, then an on-device **cache** of fetched logos,
with the existing PeggyBank matte icons as the always-available fallback. The
existing user custom-logo feature stays and always wins.

---

## A — Claude / environment capabilities

**Yes** — I can build almost the entire system inside the current Expo / RN / SQLite
project. Breakdown:

**I can implement myself (code/files/migrations):**
- The brand **manifest** as a bundled JSON/TS module (metadata only).
- The **normalization + resolver** (alias, domain, pattern, fuzzy matching, confidence).
- The **logo cache** (owned `documentDirectory/` storage + a `brand_cache` SQLite table), modeled on the existing `receiptStorage`/`customLogos` code.
- **User-confirmation UI** (reuse existing modal/list components).
- **OCR integration** — feed the merchant string extracted by Quick Capture (already ML-Kit-based) into the resolver.
- **Fallback wiring** — reuse the existing `overrideSource` prop on `PeggyIconFrame`/`IconBadge`.
- A `fetch()`-based logo download + validation (MIME/size/HTTPS) and cache write.

**I cannot do (needs you / external):**
- **Legally manufacture the logos.** I can't create official brand artwork, and bundling hundreds of trademarked logos raises redistribution/ToS issues (see L). Logos must come from a licensed provider or user upload.
- **Sign up / pay for a provider** or host a proxy — that's an account/ops decision.
- **Download logos in bulk right now** — only when given a legal source + your go-ahead, and even then on-demand+cache is preferable to bundling.

**Direct answers:** (3) I can auto-download logos from a legal API at runtime and
cache them — yes. (4) I can generate a static manifest from a controlled source you
provide — yes. (5) fuzzy/alias matching — yes. (6) cache — yes. (7) confirmation flow
— yes. (8) OCR integration — yes.

---

## B — Logo data sources (verify current terms before building)

All are **domain-keyed** unless noted. Coverage notes are directional.

| Provider | Model | Coverage | CA banks/telecom/retail | Free tier | Auth | Commercial use | Cache/bundle | Client-callable | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Logo.dev** (logo.dev) | `img.logo.dev/{domain}?token=` | Very broad (domain-based) | Good for anything with a website (CIBC, Bell, Tim Hortons all have domains) | Yes, w/ **attribution** | Publishable token | Yes (per plan) | On-device cache generally OK; **bundling/redistribution restricted** | Yes (publishable token) | Cleanest domain→logo. Paid tier removes attribution + raises limits. **Recommended provider.** |
| **Brandfetch** (brandfetch.com) | Brand API + Logo Link CDN (`cdn.brandfetch.io/{domain}`) | Very broad; also colors/fonts | Good | Yes, limited | Client ID / API key | Yes (per plan) | Caching allowed within terms; redistribution limited | Logo Link yes; full API better via backend | Bonus: returns **dominant colors** (useful for tinting frames). Strong alternative. |
| **Clearbit Logo API** (logo.clearbit.com) | `logo.clearbit.com/{domain}` | Historically broad | — | Was free | None | — | — | — | **Do NOT rely on it.** Clearbit was acquired by HubSpot; the standalone free Logo API is deprecated/uncertain. Avoid. |
| **Wikimedia Commons** | REST/`Special:FilePath` | Many company logos | Decent | Free | None | Per-file | Per-file license; **must vet each** | Yes | Free but **per-file licensing/attribution varies**; trademark still applies. Good only for a hand-vetted static subset. |
| **Google Places API** | Places details | Business metadata | Good business data | Paid | API key + backend | Yes | — | Backend recommended | Returns generic category **pins/photos, not official brand logos.** Not a logo source. |
| **Transaction-enrichment APIs** (Plaid Enrich, Flinks, MX, Ntropy, Spade) | Transaction string → merchant + logo | Excellent (built for this) | Excellent (Plaid/Flinks cover CA banks) | No / trial | API key + **backend + banking link** | Yes | Provider-hosted | Backend required | Best matching quality, but **heavy**: paid, backend, and pulls the app away from local-first. Overkill for MVP. |

**Takeaway:** for a local-first personal-finance app, **Logo.dev (primary) or
Brandfetch (alternative), domain-keyed, fetched on demand and cached** — combined
with a **local name→domain manifest** — is the pragmatic path. Enrichment APIs are
the "big-company" option and not warranted here.

---

## C — Local database (bundled) option — sizing

Two things could be bundled: **metadata** (always small) and **logo images** (the size/legal question).

**Metadata manifest** (aliases, domains, patterns, category, color, brand_id):
~250–400 bytes/brand JSON.

| Brands | Metadata JSON | Bundled logos @ ~96–128px WebP (~8–15KB ea) | Total if bundling images |
|---|---|---|---|
| 100 | ~30–40 KB | ~1–1.5 MB | ~1.5 MB |
| 250 | ~80–100 KB | ~2.5–3.5 MB | ~3.5 MB |
| 500 | ~150–200 KB | ~5–7 MB | ~7 MB |
| 800 | ~250–320 KB | ~8–12 MB | ~12 MB |
| 1,000 | ~300–400 KB | ~10–15 MB | ~15 MB |

**Is 800 logos "heavy"? Technically, no** — ~8–15 MB of images and a ~300 KB manifest
is a modest APK bump (current JS bundle alone is ~5.5 MB). Memory/startup/search are
all trivial (see O). **The blocker isn't size — it's legality of bundling 800
trademarked images** (see L) and the maintenance burden (rebrands). **Recommendation:
bundle metadata only; fetch logos on demand and cache.** Optionally bundle a *tiny*
set (~30–50) of the most common Canadian marks *only if* their licensing is clearly
safe, for instant offline coverage of the heavy hitters.

---

## D — Canadian-first starter library (definition/maintenance, NOT built)

Define as a versioned data file (`src/data/brandManifest.ts` or a downloadable
`brands.vN.json`) grouped by category, seeded ~150–300 entries across:
**Banks/Credit** (CIBC, TD, RBC, BMO, Scotiabank, National Bank, Desjardins,
Tangerine, Simplii, Amex, Visa, Mastercard), **Telecom** (Bell, Rogers, Telus,
Vidéotron, Fizz, Virgin Plus, Freedom, Koodo, Public Mobile), **Utilities**
(Hydro-Québec, Hydro One, Énergir, BC Hydro), **Streaming/Subs** (Netflix, Disney+,
Spotify, Apple, Amazon Prime, YouTube/Premium, Crave), **Grocery** (Walmart, Costco,
Metro, IGA, Super C, Maxi, Provigo, Loblaws, Sobeys, No Frills), **Restaurants/Coffee**
(Tim Hortons, McDonald's, Starbucks, Subway, A&W), **Gas/Auto** (Petro-Canada, Shell,
Esso, Ultramar, Canadian Tire), **Insurance** (Intact, Desjardins, Sun Life,
Manulife, Belairdirect, TD Insurance), **Retail** (Amazon, Best Buy, Dollarama,
Indigo, SAQ, SQDC).

**Maintenance:** the manifest is data, not code. Define it once, version it (`brands.vN.json`),
and update via a controlled process (see Q). Do **not** hand-build it now.

---

## E — Brand-matching engine

**Normalization pipeline** (raw merchant string → canonical tokens):
1. Uppercase→lowercase; Unicode NFKD; strip accents/diacritics.
2. Remove URLs but capture the **domain** (`netflix.com` → `netflix`).
3. Strip punctuation; collapse whitespace.
4. Remove **payment-processor prefixes** (`SQ *`, `TST*`, `SP `, `PAYPAL *`, `POS`, `PURCHASE`, `VISA DEBIT`, `INTERAC`, `PRE-AUTH`).
5. Remove **store/location suffixes** (`#123`, trailing numbers, `STORE 0421`, city/province tokens, `QC`, `ON`, `CA`).
6. Remove **corporate suffixes** (`inc`, `corp`, `ltd`, `ltée`, `co`, `canada`, `corporation`, `company`, `services`).
7. Result → **normalized key** + token set.

**Match order (highest precedence first):**
1. **Domain exact** (from URL) → brand. (≈1.0 confidence)
2. **Alias exact** (normalized key ∈ brand.aliases). (≈0.98)
3. **merchant_pattern regex** (e.g. `^bell( canada)?( mobilit[ée])?`). (≈0.95)
4. **Fuzzy** (trigram/Jaccard + token overlap; Levenshtein for short strings) with per-length thresholds. (0.75–0.94)
5. None → PeggyBank fallback icon.

**False-positive guards:** require a minimum token length; block generic words
(`payment`, `bill`, `store`, `card`); prefer exact over fuzzy; never fuzzy-match a
2–3 char token; a fuzzy hit below the auto threshold must be **confirmed**, never
auto-applied.

**Schema (proposed, improve as needed):**
```
brand_id           string   // 'cibc', 'bell', 'tim_hortons'
display_name       string
aliases            string[] // normalized keys
domains            string[] // 'cibc.com', 'bell.ca'
merchant_patterns  string[] // regex sources
category           IconKey  // maps to a PeggyBank fallback concept
dominant_color     string   // '#EC1C2E' (frame tint / brand color)
country            string   // 'CA'
logo_source        'logodev' | 'brandfetch' | 'bundled' | 'wikimedia'
local_asset        string?  // bundled path, if any
remote_domain      string   // domain to request from the provider
status             'active' | 'deprecated'
```

---

## F — Confidence rules

- **Auto-apply:** domain exact, alias exact, or pattern match → confidence ≥ 0.95.
- **Ask to confirm:** single fuzzy candidate, 0.80–0.94 → inline chip "Is this Bell?".
- **Show options:** ≥2 candidates within 0.05 of each other, or an ambiguous token ("bell") → small picker of 2–3.
- **Fallback:** best < 0.80 → PeggyBank premium category icon, no prompt.
- **Rule:** the app **never auto-displays a logo below the auto threshold.** Wrong-brand display is worse than no logo.

---

## G — Hybrid architecture (evaluated)

The proposed 5-level design is **correct**, with one refinement (order the checks by
cost/authority, and put the user override at the very top of *precedence* even though
it's a late *lookup*):

- **L1 Bundled manifest (offline):** resolve name→brand_id locally, instantly, no network.
- **L2 On-device cache:** already-fetched logo for this brand_id.
- **L3 Trusted online lookup:** fetch by domain from the provider; validate; cache.
- **L4 User override:** the existing custom-logo feature.
- **L5 PeggyBank premium fallback.**

Refinement: **precedence at render time** = user override → cached/verified brand
logo → fallback icon. The manifest (L1) is the *resolver*; L2/L3 are *acquisition*.
This is the right design.

---

## H — Logo cache design

- **Location:** `documentDirectory/brand-logos/` (owned, like `receipts/` and `logos/`).
- **Filename:** `{brand_id}@{version}.png` (version = manifest version or provider ETag/hash) → auto-invalidates on rebrand.
- **DB relation:** `brand_cache(brand_id TEXT PK, uri TEXT, version TEXT, fetched_at INTEGER, status TEXT)`; `status ∈ ready|negative|stale`.
- **TTL/invalidation:** long TTL (e.g. 60–90 days) or version-based; refresh on manifest bump.
- **Negative cache:** failed/unknown fetch → `status='negative'` with exponential backoff so we don't re-hit every launch.
- **Size cap + cleanup:** LRU cap (e.g. 20–40 MB); evict least-recently-used.
- **Offline:** cache + bundled manifest serve; unknown → fallback.
- **Failure/corruption:** validate MIME + decode; on failure delete file, mark negative, show fallback.
- **App update:** cache survives (documentDirectory persists); a manifest version bump refreshes changed logos lazily.

Net effect: Netflix/Bell are fetched **once**, then served from disk forever.

---

## I — Fit with the existing custom-logo feature

Keep it; it becomes **L4 and the top precedence**. Final render precedence:
1. **User custom logo** (existing `custom_logos`, keyed by name) — always wins.
2. **Verified brand logo** (resolved brand_id → `brand_cache`).
3. **PeggyBank premium icon** (registry fallback).

Confirmed: **user customization always wins.** Implementation-wise, both already flow
through the same `overrideSource` render path — the brand system just supplies a URI
when no user custom exists.

---

## J — OCR integration (Quick Capture)

```
Camera → ML Kit OCR → text lines → merchant candidate (top lines / patterns)
       → normalize → brand resolver → { brand_id, logo, confidence }
       → category classifier → Review screen (prefilled name + logo + category)
       → user confirms (or corrects) → save (store merchant_raw_name + brand_id)
```
- `"BELL"` → alias → brand `bell`, auto.
- `"TIM HORTONS #123"` → strip `#123` → alias `tim hortons` → `tim_hortons`, auto.
- `"WAL-MART CANADA CORP"` → strip `canada`/`corp`, dehyphenate → alias `walmart` → auto.
- `"CIBC VISA 1234"` → strip trailing digits → pattern/alias `cibc` → `cibc`, auto (category = debt/credit).
Low confidence → Review screen shows "Is this Bell?" rather than guessing.

---

## K — Where brand identity is stored (relational model)

Keep brand identity **global and name-derived**, mirroring the current name-keyed
custom-logo approach, so a **Bell bill, Bell subscription, and Bell expense
automatically share** the same logo:

- **Global:** `brand_cache` (brand_id → logo uri/version). Resolution is shared by normalized name.
- **Per record (optional denormalization for stability):** store `merchant_raw_name` (what the user/OCR entered) and optionally the resolved `brand_id` on the bill/subscription/debt/expense row. `merchant_raw_name` is worth storing (audit + re-resolve on manifest updates); `brand_id` denormalization is optional (nice for stability, but re-resolving by name is fine).
- **User overrides** remain in `custom_logos` (name-keyed), unchanged.

Cleanest model: records store `merchant_raw_name`; a shared resolver + `brand_cache`
supply the logo; `custom_logos` overrides win. No per-record logo blobs.

---

## L — Legal / trademark / licensing (mandatory)

- **Displaying a merchant's logo next to that merchant's own transaction** to identify
  it is **nominative/descriptive use** — widely done by banking/finance apps and
  generally low-risk. It is not sponsorship or endorsement.
- **Bundling hundreds of logos in the APK = redistribution.** This raises both
  trademark redistribution concerns *and* provider ToS issues (several providers
  forbid bundling/redistribution). **Prefer on-demand fetch + on-device cache.**
- **Fetching from a licensed aggregator** (Logo.dev/Brandfetch) shifts sourcing under
  the provider's license/terms — cleaner than scraping. **Verify each provider's
  current commercial-use, caching, and redistribution clauses before shipping.**
- **User-supplied logos** (the existing feature) shift responsibility to the user —
  lowest risk; keep it.
- **Attribution:** some providers (e.g. Logo.dev free tier) require an attribution
  link — budget a small "logos by …" line where required.
- **Do not recolor, distort, crop-badly, or modify logos** — trademark integrity;
  present them unmodified (this is also why we render them `contain`/`cover` cleanly,
  not tinted). Don't imply the brand endorses PeggyBank.
- **Practical production-safe stance:** on-demand fetch from one licensed provider +
  cache + unmodified display + fallback icon + user override; no bulk bundling;
  attribution where required; re-verify ToS at build time.

---

## M — Online / offline behavior

- **Online:** unknown merchant → resolve via manifest → fetch logo by domain → validate → cache → display.
- **Offline:** bundled manifest still resolves the brand_id; cached logos display; **unknown/never-fetched brands show the PeggyBank fallback icon.** No errors, no blank frames.
- The app is **fully usable offline**; logos are a progressive enhancement, never a dependency.

---

## N — Backend question

- **Option 1 (no backend, client → provider):** simplest; OK if the provider offers a *publishable* token (Logo.dev does). Risk: token in the app, rate-limit exposure, and (privacy) the app talks to a third party directly.
- **Option 2 (tiny PeggyBank proxy):** hides the real API key, adds caching/CDN, can strip identifying data (only a domain leaves the device), normalizes/monitors usage.
- **Option 3 (hosted versioned manifest):** PeggyBank serves `brands.vN.json` so the brand list updates without app releases.
- **Option 4 (all-static local):** fully offline, but stale and can't cover the long tail; bundling images has the legal issue.

**Recommendation:** **Option 2 + Option 3** (a minimal serverless proxy that also
hosts the manifest) for production — cheap (Cloudflare Worker/Vercel edge), protects
the key, enables manifest updates, best privacy. **For an MVP**, Option 1 with a
publishable Logo.dev token is acceptable and can graduate to the proxy later.

---

## O — Performance

All trivial on a modern Android device:
- Search **100 / 800 / 5,000** brands: exact/alias lookup is a hash-map/index → sub-millisecond; trigram fuzzy over 5k entries → low single-digit ms. Build a normalized alias index once at startup.
- Cached logo load from disk: instant.
- Logo list rendering: standard image rendering; cache in memory.
- **Verdict:** computationally trivial; no perf concerns even at 5k brands.

---

## P — UX

- User types `Bell Internet` → within a fraction of a second the **Bell logo** appears beside the name; no interruption.
- Uncertain → a small inline chip: **"Is this Bell?"** (tap ✓/✕).
- Ambiguous → 2–3 logo options.
- No match → the PeggyBank Bills icon stays.
- Feels **magical, not like extra work**; the existing "Add/Change logo" control remains for manual override.

---

## Q — Maintenance

- Companies rebrand/merge/disappear → the **manifest is versioned data**; bump `brands.vN.json`, cache invalidates by version.
- **Claude can generate/update the manifest** from a controlled source you provide (a CSV/registry of brand → domain → aliases) — a repeatable, reviewable generation step, not hand-editing.
- **Downloadable manifest** (Option 3) lets the brand list update **without an app store release**.
- Migrations: additive (new `brand_cache` table, optional `merchant_raw_name` columns) — no destructive changes.

---

## R — Security

- **Only HTTPS**; reject `http`.
- **Whitelist provider hosts** (don't fetch arbitrary user/remote URLs from the resolver path — arbitrary URLs only via the *user* upload path, which copies a local file, not a remote fetch).
- **MIME + magic-byte validation** (png/jpg/webp only); **decode-safety** (reject on decode failure).
- **File-size cap** (e.g. ≤ 512 KB/logo) and **timeout**; cap redirects.
- **No tracking pixels**: fetch to a file, don't render remote URLs directly.
- **API key**: never embed a secret key; use a publishable token or the proxy.
- Corrupted/oversized/failed → discard + negative-cache + fallback.

---

## S — THE recommendation (one architecture)

**Build this:**
- **Local manifest:** bundled **metadata-only** Canadian starter (~200–300 brands: aliases, domains, patterns, category→fallback IconKey, dominant_color). ~100–300 KB. No bundled images (legal + size).
- **Resolver:** normalization pipeline → domain/alias/pattern exact → trigram fuzzy → confidence tiers (F). Startup-built alias index.
- **Online provider:** **Logo.dev** (domain-keyed), **fetched on demand**. (Brandfetch is the drop-in alternative, bonus brand colors.)
- **Backend:** start **keyless-direct with a publishable token (MVP)**; move to a **tiny serverless proxy + hosted versioned manifest** for production (key protection, updates, privacy).
- **Cache:** owned `documentDirectory/brand-logos/`, `{brand_id}@{version}.png`, `brand_cache` table, negative-cache + LRU cleanup (H).
- **Precedence:** **user custom → verified brand → PeggyBank icon** (reuse the existing `overrideSource` render path).
- **OCR:** Quick Capture merchant string → resolver → prefilled Review screen with logo + category; confirm on low confidence.
- **Privacy/offline:** manifest works offline; only a **domain** ever leaves the device (via the proxy); unknown → fallback; app fully usable offline.
- **Legal:** on-demand fetch from one licensed provider, unmodified logos, attribution where required, no bulk bundling, verify ToS at build.

---

## T — Implementation cost

- Manifest (metadata, ~250 brands): **SMALL to build, MEDIUM to curate/maintain.**
- Normalizer + resolver + confidence: **MEDIUM.**
- Logo cache (storage + table + negative-cache): **SMALL–MEDIUM.**
- Provider fetch + validation: **SMALL.**
- Render integration (reuse `overrideSource`): **SMALL.**
- OCR hook into Quick Capture: **SMALL.**
- Serverless proxy + hosted manifest (optional for MVP): **SMALL** to build, but **new infra/ops.**
- **HIGH-RISK:** legal/ToS verification; false-positive tuning; provider longevity (Clearbit's fate is the cautionary tale).

**Is it a massive backend project? No.** It's **one manifest + one resolver + one
cache + one provider + a few DB fields + UI reuse**, plus an *optional* tiny proxy.
The engineering is modest; the ongoing work is curation and legal diligence.

---

## U — Files/areas that would eventually change (for reference only — not touched)

**New:** `src/data/brandManifest.ts` (or hosted `brands.vN.json`); `src/lib/brandResolver.ts`;
`src/lib/brandLogoCache.ts`; a resolution hook/`src/context/BrandContext.tsx`.
**DB:** new `brand_cache` table; optional `merchant_raw_name`/`brand_id` columns on
bills/subscriptions/debts/expenses; add both to `ALL_TABLES` wipe + the delete-all-data flow.
**Render:** reuse `PeggyIconFrame`/`IconBadge` `overrideSource`; a small resolution
layer that supplies the brand logo when no user custom exists (so `PeggyListRow`,
`PeggyGoalCard`, Bills/Debt/Goals/Income/Spending pick it up automatically).
**OCR:** `QuickCaptureScreen` + `src/lib/recognition/*` feed the merchant into the resolver.
**Existing custom-logo system:** unchanged; sits at the top of precedence.
**Deps (only if approved):** an image/fuzzy helper is optional — trigram matching can
be hand-written; no heavy dependency required. A provider token/proxy is the only
external addition.

---

**END OF RESEARCH. No code was written, no dependencies added, no schema changed,
no assets downloaded. Awaiting explicit approval before any implementation.**
