# Step 1 — Set environment variables · L4 · 12B track (Gemma 4 12B)

> **What this does:** Defines every shell variable the rest of the workshop
> relies on — which model, which project/region, your HuggingFace token, and the
> names of the service account, bucket, and VPC we'll create. Every later step
> reads these instead of hard-coding values.
>
> **Why it matters:** These variables are the single source of truth for the
> whole deploy. Set them once, correctly, and steps 2–10 just work. Get the
> Project ID or HF token wrong here and everything downstream fails in confusing
> ways.

| | |
|---|---|
| ⏱ **Time** | ~3 minutes |
| 💰 **Cost** | $0 — nothing is created yet |

**Prerequisites**
- Completed [`00_prerequisites.md`](../00_prerequisites.md): project + billing, HF token, and you **accepted the Gemma 4 12B terms** at <https://huggingface.co/google/gemma-4-12B-it>
- Cloud Shell open (see [`00_cloud_shell_guide.md`](../00_cloud_shell_guide.md))

> ℹ️ Exports live only for **this** shell session. If Cloud Shell disconnects,
> re-paste this whole block to restore your environment.

---

## Two setup options — pick one before you run anything

> **Option A — Use the speaker's shared bucket** *(recommended for the workshop — saves ~15–20 min)*
> The weights are already cached. **Skip Steps 4, 5, and 7.** Run the env block
> below, then run this one line to override the model location:
> ```bash
> export GCS_MODEL_LOCATION="gs://<PROJECT_ID>-asia-southeast1-hf-model-cache/model-cache/google/gemma-4-12B-it"
> ```
> Then continue at Step 6 → 8 → 9 → 10.
>
> ⚠️ **The shared bucket is only available during the workshop event and will be
> revoked afterward.** For anything you keep, use Option B. See [`../SHARED_BUCKET.md`](../SHARED_BUCKET.md).

> **Option B — Cache your own model** *(full control — adds ~15–25 min)*
> Keep the `GCS_MODEL_LOCATION` derived in the env block below and run **Steps 4,
> 5, and 7** normally. You own the bucket afterward.

---

```bash
# ---------- Model ----------
# Gemma 4 12B: Google's mid-size dense model, released June 2, 2026. 12B params,
# unified text+image+audio, 256K context. ~14 GB at BF16 / ~7-8 GB at FP8 — a
# much better fit for the L4's 24 GB than E4B (which was built for phones).
# Instruction-tuned ("-it"). Same cost per hour on the L4, meaningfully smarter.
export MODEL_NAME="google/gemma-4-12B-it"

# ---------- Cloud Run service ----------
# Model-suffixed name so this never clashes with the E4B L4 service or the RTX one.
# Lowercase letters, numbers, hyphens only.
export SERVICE_NAME=gemma-l4-12b-vllm-workshop

# ---------- Project / Region ----------
# >>> EDIT THIS: your real Project ID (Home -> Project info card). <<<
export GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT_ID>

# Region for ALL resources (bucket, VPC, Cloud Run). Singapore is closest to
# Manila (~29ms) and keeps Direct VPC Egress single-region (faster cold starts).
export GOOGLE_CLOUD_REGION=asia-southeast1

# ---------- HuggingFace ----------
# >>> EDIT THIS: the hf_... token you created. Needed to download the gated
# >>> Gemma weights in step 5. Keep it secret. <<<
export HF_TOKEN="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"   # CHANGE THIS

# ---------- Service account ----------
# A dedicated identity for the Cloud Run service (created in step 3). We do NOT
# reuse the default Compute Engine SA — see step 3 for why.
export SERVICE_ACCOUNT="vllm-service-sa"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"

# ---------- Cloud Storage (model weight cache) ----------
# Bucket names are GLOBALLY unique, so we prefix with project + region.
export MODEL_CACHE_BUCKET="${GOOGLE_CLOUD_PROJECT}-${GOOGLE_CLOUD_REGION}-hf-model-cache"
# Full GCS path vLLM loads from (instead of HuggingFace) at cold start. The model
# name is in the path, so the E4B and 12B tracks can share one bucket safely.
export GCS_MODEL_LOCATION="gs://${MODEL_CACHE_BUCKET}/model-cache/${MODEL_NAME}"

# ---------- VPC (for Direct VPC Egress) ----------
# Names templated by region so multiple regions don't collide.
export VPC_NETWORK="vllm-${GOOGLE_CLOUD_REGION}-net"
export VPC_SUBNET="vllm-${GOOGLE_CLOUD_REGION}-subnet"
# Small private CIDR (RFC 1918). /26 = 64 addresses, plenty for Cloud Run.
export SUBNET_RANGE="10.8.0.0/26"

# ---------- Apply project + default region to gcloud ----------
gcloud config set project "${GOOGLE_CLOUD_PROJECT}"
gcloud config set run/region "${GOOGLE_CLOUD_REGION}"
```

---

## ✅ Verify

```bash
echo "Model:   $MODEL_NAME"
echo "Project: $GOOGLE_CLOUD_PROJECT"
echo "Region:  $GOOGLE_CLOUD_REGION"
echo "Bucket:  $MODEL_CACHE_BUCKET"
echo "HF token set? ${HF_TOKEN:0:3}...(hidden)"
```

- `GOOGLE_CLOUD_PROJECT` must **not** print `<YOUR_PROJECT_ID>`.
- The HF line should print `hf_...(hidden)`, not `hf_xxx...`.

---

**Next →** [`step_02_enable_apis.md`](step_02_enable_apis.md)
