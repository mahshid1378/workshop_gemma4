# Step 2 — Enable the required GCP APIs · L4 · E4B track

> **What this does:** Turns on the seven Google Cloud APIs this deploy touches.
> On a fresh project most are off by default; calling them before they're
> enabled returns a `SERVICE_DISABLED` error.
>
> **Why it matters:** Every `gcloud` command in later steps is really an API
> call under the hood. Enabling them all up front means no surprise "please
> enable X" errors mid-workshop.

| | |
|---|---|
| ⏱ **Time** | ~2 minutes (enabling can take a minute to propagate) |
| 💰 **Cost** | $0 — enabling an API is free; you pay only for what you use |

**Prerequisites**
- Step 1 done (`GOOGLE_CLOUD_PROJECT` set, gcloud pointed at your project)

---

```bash
# Enable all seven in one call. See the table below for what each is for.
gcloud services enable \
  run.googleapis.com \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  aiplatform.googleapis.com
```

| API | Why we need it |
|---|---|
| `run.googleapis.com` | **Cloud Run** — hosts our vLLM container with a GPU |
| `compute.googleapis.com` | **Compute Engine** — backs the VPC, subnet, and GPUs |
| `cloudbuild.googleapis.com` | **Cloud Build** — runs the model-download job (step 5) |
| `artifactregistry.googleapis.com` | **Artifact Registry** — stores container images (the vLLM image is pulled from a public AR repo) |
| `storage.googleapis.com` | **Cloud Storage** — the bucket that caches the weights |
| `iam.googleapis.com` | **IAM** — lets us create the dedicated service account |
| `aiplatform.googleapis.com` | **Vertex AI** — home of the Model Garden vLLM image we deploy; keeps image pulls happy |

---

## ✅ Verify

```bash
gcloud services list --enabled \
  --filter="config.name:(run.googleapis.com OR compute.googleapis.com OR cloudbuild.googleapis.com)" \
  --format="value(config.name)"
```

You should see all three names. If one is missing, re-run the enable command
(propagation can lag a few seconds).

---

**Next →** [`step_03_service_account.md`](step_03_service_account.md)
