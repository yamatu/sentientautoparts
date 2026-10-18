# AI listing optimization (products → AI Job Center)

The products admin has two AI entry points that share one pipeline: **「AI 智能优化」**
(a background job over a product selection) and **「粘贴资料批量导入」** (fixed-format
pasted listings). The product create/edit form additionally offers an inline
**AIListingAssist** panel. All three produce a *proposal* — nothing is published
without an administrator saving/approving.

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
foreign brand mention and no invented specification. A failed answer is retried
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
