# Shared Model Bucket

This bucket contains pre-cached Gemma 4 model weights for the GDG Cloud Manila 2026 workshop.

## Bucket URL
gs://<PROJECT_ID>-asia-southeast1-hf-model-cache

## Available Models
- google/gemma-4-E4B-it    (~9 GB, edge model)
- google/gemma-4-12B-it    (~28 GB, L4 sweet spot)
- google/gemma-4-31B-it    (~62 GB, RTX 6000 Pro demo model)

## Why Use This
Skip the 15-20 minute model download during the workshop. Point your Cloud Run service directly at this bucket.

## Region Requirement
Your Cloud Run service MUST be deployed in `asia-southeast1` for free intra-region egress. Cross-region downloads will incur egress charges (~$0.12/GB).

## Temporary Availability
This bucket is publicly readable only during the workshop event. Public access will be revoked after.

For production use, cache your own copy in your own bucket using Steps 4 and 5 of the workshop.

## Verify the bucket (run these first)

> ℹ️ These `gcloud storage` commands need the bucket name set. If you see
> `Cloud URL scheme should be followed by colon and two slashes … Found: "gs:///…"`,
> the variable was empty — run the `export SHARED_BUCKET=…` line first.

**What's cached in the bucket:**

```bash
export SHARED_BUCKET="<PROJECT_ID>-asia-southeast1-hf-model-cache"

# Which model folders actually exist
gcloud storage ls "gs://${SHARED_BUCKET}/model-cache/google/"

# Size per model (expect E4B ~9 GB, 12B ~28 GB, 31B ~62 GB; missing/empty = not cached)
gcloud storage du -s "gs://${SHARED_BUCKET}/model-cache/google/gemma-4-E4B-it"
gcloud storage du -s "gs://${SHARED_BUCKET}/model-cache/google/gemma-4-12B-it"
gcloud storage du -s "gs://${SHARED_BUCKET}/model-cache/google/gemma-4-31B-it"
```

**Is the bucket public or private right now?**

```bash
export SHARED_BUCKET="<PROJECT_ID>-asia-southeast1-hf-model-cache"

# 1. Is anyone (allUsers / allAuthenticatedUsers) granted access?
gcloud storage buckets get-iam-policy "gs://${SHARED_BUCKET}" \
    --format="value(bindings.members)" | tr ';,' '\n' \
    | grep -qE 'allUsers|allAuthenticatedUsers' \
    && echo ">>> PUBLIC: an allUsers/allAuthenticatedUsers binding exists" \
    || echo ">>> PRIVATE: no public binding"

# 2. Is the public-access-prevention guardrail on?
#    "enforced"  = nothing in this bucket can be made public
#    "inherited" = public access is allowed
gcloud storage buckets describe "gs://${SHARED_BUCKET}" \
    --format="value(public_access_prevention)"
```

## Making the bucket public (speaker only)

> ⚠️ **Granting `allUsers` read access makes every object in this bucket readable
> by anyone on the internet — no Google account required.** Only do this for a
> bucket of open model weights you are deliberately sharing for a live event;
> never for a bucket that holds anything private. **Double-check what's in the
> bucket before you run it, and revoke access the moment the workshop ends.**

When you're ready to share, grant public **read-only** access:

```bash
# Your shared bucket (no gs:// prefix needed here)
export SHARED_BUCKET="<PROJECT_ID>-asia-southeast1-hf-model-cache"

gcloud storage buckets add-iam-policy-binding "gs://${SHARED_BUCKET}" \
    --member="allUsers" \
    --role="roles/storage.objectViewer"
```

> ℹ️ The workshop creates buckets with **public access prevention enforced** and
> **uniform bucket-level access** (Step 4). If the command above errors with
> *"public access prevention is enforced"*, turn it off first, then re-run:
> ```bash
> gcloud storage buckets update "gs://${SHARED_BUCKET}" --no-public-access-prevention
> ```

**Revert it (revoke public access) as soon as the workshop is over:**

```bash
gcloud storage buckets remove-iam-policy-binding "gs://${SHARED_BUCKET}" \
    --member="allUsers" \
    --role="roles/storage.objectViewer"

# And re-enable the public-access guardrail you turned off above:
gcloud storage buckets update "gs://${SHARED_BUCKET}" --public-access-prevention
```

Verify nothing is public anymore:

```bash
gcloud storage buckets get-iam-policy "gs://${SHARED_BUCKET}" \
    --format=json | grep -A2 allUsers || echo "No allUsers binding — bucket is private again."
```

## License
The Gemma 4 model is Apache 2.0 licensed by Google DeepMind. Original source: https://huggingface.co/google
