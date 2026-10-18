# AI listing optimization (products → AI Job Center)

The products admin has two AI entry points that share one pipeline: **「AI 智能优化」**
(a background job over a product selection) and **「粘贴资料批量导入」** (fixed-format
pasted listings). The product create/edit form additionally offers an inline
**AIListingAssist** panel. All three produce a *proposal* — nothing is published
without an administrator saving/approving.

## Listing format

One listing (AI output, pasted import and the product form) carries:

- **Basic information** — name, SKU, category, weight, part brand / manufacturer,
  product / supplier model, primary part reference, warranty, delivery time,
  short description and a description laid out as an opening paragraph followed by
  `Key Features & Technical Highlights:` lines (the last one is always
  `Fitment Verification: ...`).
- **Auto part specs** — part type, vehicle make, compressor series, refrigerant,
  voltage, pulley grooves, pulley diameter, displacement, oil type, oil capacity.
- **OE / OEM references** and **cross / interchange references**, one per line.
  AI output gets the compact spelling of every separated OE number added
  (`services.ExpandListingOEVariants`).
- **Vehicle fitment list** — `Fitment N` blocks (make, model, engine, source /
  notes, start year, end year) plus the fitment verification note.
- **SEO** — title, description, keywords.

`services.ParseProductListingText` reads this exact layout: `Fitment N` opens a
fitment row so its `Make`/`Model` labels do not overwrite the listing's own make
and model, and spec labels such as `Refrigerant:` never end a description block
(they are common feature lines). `TestParseAutomotiveListingFormat` holds a full
sample.

Writing rules: the job only fills empty spec columns, appends OE / interchange
references that are not stored yet and writes fitment rows only when the product
has none; a pasted import overwrites exactly the fields the administrator ticks.

## Taxonomy boundary (automotive)

`CATALOG_DOMAIN=automotive` fixes the category tree at two levels:

| Part type (`part_type`) | Root category |
| --- | --- |
| `A/C Compressor` | `A/C Compressors` |
| `Condenser` | `Auto Condensers` |
| `Evaporator Unit` | `Evaporator Units` |
| `Expansion Valve` | `Expansion Valves` |

- The **root is administrator-owned**; `services.ResolveAutomotiveListingCategory`
  refuses to create it and reports `一级分类不存在：<name>` instead.
- Only the **vehicle-make child** may be created, behind
  `withCategoryCreationLock` + `uniqueCategorySlug`, and an inactive child is
  reactivated rather than duplicated.
- A vehicle make is never written as the brand, and unknown makes/years/engines
  are dropped instead of guessed (`services.FallbackAutomotiveCategoryPath`).
- `services.CanonicalAutomotivePartType` folds any spelling onto the display
  value ("a/c compressors" → "A/C Compressor"), so `products.part_type` stays one
  of the four values above whenever it is recognisable.

## Prompts

`controllers/ai_listing.go` holds `aiListingSystemPrompt` and
`aiListingCategorySystemPrompt`. Both keep a static `PART_TYPE_OPTIONS`
placeholder; `aiListingPrompts()` substitutes
`services.AutomotivePartTypeOptions()` at call time so the prompts stay testable
and reusable. `TestAIListingPromptsRenderAutomotiveTaxonomy` fails if the
placeholder survives or industrial brands reappear.

## Jobs

- `POST /admin/ai-agent/listing/jobs` creates an `AIAgentSEOJob` with
  `selection_mode = listing_optimization`; the worker branch in
  `controllers/ai_seo_jobs.go` dispatches it to `processListingOptimizationJob`
  (`controllers/ai_listing_jobs.go`).
- The options are stored **inside the job prompt** after the
  `[[VIBOCNC_LISTING_JOB_OPTIONS=` marker (Base64URL JSON) so the AI Job Center can show
  the exact scope the job was started with.
- Item statuses include `skipped` (quality gate passed, nothing rewritten),
  `unresolved` (no evidence found) and `optimized`. `finalizeListingJob` counts
  `skipped` as a success, so a healthy run reports `completed` rather than
  `completed_with_errors`.
- The worker reads the active AI profile per item (`newAIJobConfigSource`), so the
  model can be switched while a job runs.
- `POST /admin/ai-agent/seo/jobs/:id/end` ends a `queued`, `running` or `paused`
  job in batches (`releaseEndedJobItems`); completed product results are kept.

## Quality gate

`services.EvaluateListingQuality` decides whether a product needs work before any
AI call, and `listingContentProblem` re-checks the model's answer. The contract:
the description must name the exact part number/model, be long enough, contain no
foreign brand mention and no invented specification. In automotive mode the gate
also checks the fixed format (`services.EvaluateListingFormat`: description has the
`Key Features` block; name, short description and meta title contain the SKU; at
least 6 meta keywords) and data gaps (no OE numbers; no fitment, or fitment rows
without any year/engine; compressors with fewer than 3 of series / refrigerant /
voltage / pulley grooves / pulley diameter). Legacy imports have SEO of a fine
length, so length checks alone used to pass them. The format rules are also
enforced on AI answers; data gaps are not, since research may not find them.
`DisableAutoSEO` does not skip a product in this explicitly started job — every
legacy import carries it, so the gate decides instead. A failed answer is retried
once with the failure reason as feedback.

## Import

`POST /admin/ai-agent/listing/import/preview` parses pasted fixed-format listings
into `services.ProductListingRecord` values and diffs them against existing
products by SKU/part number; `.../import/apply` writes only the fields the
administrator approved. `services.SanitizeListingRecord` (and therefore
`NormalizeListingRecord`) is the single cleaning point — scraping/HTML cleanup,
identifier cleanup and the part-type canonicalisation all live there.

## Frontend

- `components/admin/AIListingJobModal.tsx` — scope picker for a background job.
- `components/admin/ListingImportModal.tsx` — paste → preview → apply.
- `components/admin/AIListingAssist.tsx` — inline panel in the product form.
- `app/admin/ai-seo/page.tsx` — the AI Job Center: job tabs
  (`all` / `active` / `finished`), per-status counters (`status_counts`), SKU
  search (`q`), ETA, end-job and retry-failed actions.
