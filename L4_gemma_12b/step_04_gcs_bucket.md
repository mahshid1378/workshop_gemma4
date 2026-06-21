# Step 4 — Create the regional GCS bucket · L4 · 12B track

> ## ⏭️ OPTIONAL — only for Option B (your own bucket)
> **Skip this step if you chose Option A** (the speaker's shared bucket) in
> [`step_01_env_vars.md`](step_01_env_vars.md) — jump to the next required step,
> [`step_06_vpc_network.md`](step_06_vpc_network.md). This step is only needed if
> you're caching your own model in your own bucket (Option B).

> **What this does:** Creates a Cloud Storage bucket in the same region as
> everything else. This bucket caches the Gemma weights so Cloud Run can stream
> them at cold start instead of pulling ~28 GB from HuggingFace every time.
>
> **Why it matters:** Downloading the model from HuggingFace on every cold start
> would be slow and rate-limited. Caching in a regional bucket — colocated with
> the Cloud Run service — makes cold starts fast and repeatable. "Regional" (not
> multi-region) keeps reads local and cheap.

| | |
|---|---|
| ⏱ **Time** | ~1 minute |
| 💰 **Cost** | ~$0 now; storage is ~$0.02/GB/mo. 28 GB ≈ ~$0.56/mo if you forget to delete it. `step_99` cleans it up. |

**Prerequisites**
- Step 1 done (`MODEL_CACHE_BUCKET`, `GOOGLE_CLOUD_REGION` set)
- Step 2 done (`storage.googleapis.com` enabled)

> ℹ️ Sharing a project with the E4B L4 track? The bucket name is the same, so
> whoever runs step 4 first creates it; the second run will say "already exists"
> — that's fine, the two models cache to different subpaths inside it.

---

```bash
# Create the bucket. Flags explained below.
gcloud storage buckets create "gs://${MODEL_CACHE_BUCKET}" \
  --location="${GOOGLE_CLOUD_REGION}" \
  --uniform-bucket-level-access \
  --public-access-prevention
```

- `--location` → **Regional**, same region as Cloud Run. Keeps weight streaming
  fast and avoids egress charges.
- `--uniform-bucket-level-access` → disables per-**object** ACLs entirely. Access
  is controlled **only** by IAM at the bucket level. Simpler to reason about, the
  modern default, and it stops a stray object ACL from quietly making one file
  public.
- `--public-access-prevention` → a hard guarantee nothing in this bucket can ever
  be exposed to the public internet, even if someone later tries to grant
  `allUsers`. Your weights stay private.

---

## ✅ Verify

```bash
gcloud storage buckets describe "gs://${MODEL_CACHE_BUCKET}" \
  --format="value(location, uniform_bucket_level_access.enabled, public_access_prevention)"
```

Expect something like: `ASIA-SOUTHEAST1   True   enforced`

---

**Next →** [`step_05_cache_model.md`](step_05_cache_model.md)
