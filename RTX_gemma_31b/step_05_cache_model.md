# Step 5 — Cache the model weights into GCS · RTX track

> ## ⏭️ OPTIONAL — only for Option B (your own bucket)
> **Skip this step if you chose Option A** (the speaker's shared bucket) in
> [`step_01_env_vars.md`](step_01_env_vars.md) — jump to the next required step,
> [`step_06_vpc_network.md`](step_06_vpc_network.md). This step is only needed if
> you're caching your own model in your own bucket (Option B).

> **What this does:** Runs a one-off **Cloud Build** job that downloads the
> Gemma 4 31B weights from HuggingFace and uploads them into the GCS bucket from
> step 4. We do the heavy download **once**, on Google's network, rather than on
> every Cloud Run cold start.
>
> **Why it matters:** vLLM will load the model from GCS (fast, internal network)
> instead of from HuggingFace (slow, rate-limited, sometimes flaky). This is what
> makes cold starts in step 9 tolerable. Running it in Cloud Build (not in Cloud
> Shell) means the multi-GB transfer happens on a big build VM, not your laptop's
> session.

| | |
|---|---|
| ⏱ **Time** | **~15–20 min** for 31B (it's ~62 GB). Grab a coffee. *(E4B on the L4 track is only ~5–10 min.)* |
| 💰 **Cost** | A few cents of Cloud Build time + ~$1.20/mo storage until cleanup |

**Prerequisites**
- Steps 1–4 done; `HF_TOKEN` is real and you **accepted the 31B terms** (step 6 of prerequisites)
- `cloudbuild.googleapis.com` enabled (step 2)

---

### 1. Write the build config

We generate a `cloudbuild.yaml` with a **heredoc** (`cat > file <<'EOF' … EOF`).
The single-quoted `'EOF'` means the shell does **not** expand `$` inside the
block — so `${_MODEL_NAME}` etc. stay literal and are filled in by Cloud Build's
own substitution engine at run time (not by your shell).

```bash
cat > cloudbuild.yaml <<'EOF'
steps:
  # Step A: download the gated model from HuggingFace into the build workspace.
  - name: "python:3.12-slim"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        set -euo pipefail
        pip install --no-cache-dir "huggingface_hub[cli]"
        # hf download pulls every file for the repo into ./model using our token.
        hf download "${_MODEL_NAME}" \
          --token "${_HF_TOKEN}" \
          --local-dir ./model
  # Step B: copy the downloaded files up to GCS. rsync only uploads what changed,
  # so re-running this build is cheap and idempotent.
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        set -euo pipefail
        gcloud storage rsync ./model "${_GCS_MODEL_LOCATION}" --recursive

# Substitutions are filled from the gcloud command below. Keeping the token here
# (not hard-coded in the YAML) keeps the file safe to read/share.
substitutions:
  _MODEL_NAME: ""
  _HF_TOKEN: ""
  _GCS_MODEL_LOCATION: ""

options:
  # RTX track: the 31B download is large, so we use a beefy build machine and a
  # big disk. (L4 track uses E2_HIGHCPU_8 / 100GB — same shape, smaller numbers.)
  machineType: "E2_HIGHCPU_32"
  diskSizeGb: 500

# Generous cap; 31B usually finishes well under this.
timeout: "3600s"
EOF
```

### 2. Submit the build

```bash
# --no-source means "don't upload a source folder" — the config IS the job.
# --substitutions injects our env vars into the _PLACEHOLDERS above.
gcloud builds submit --no-source \
  --config=cloudbuild.yaml \
  --substitutions=_MODEL_NAME="${MODEL_NAME}",_HF_TOKEN="${HF_TOKEN}",_GCS_MODEL_LOCATION="${GCS_MODEL_LOCATION}"
```

> ℹ️ **403 Forbidden during download?** You haven't accepted the Gemma 4 31B
> license on HuggingFace with the account that owns this token. Fix it at
> <https://huggingface.co/google/gemma-4-31B-it>, then re-run the submit.

---

## ✅ Verify

```bash
# You should see model files (config.json, *.safetensors, tokenizer files, ...).
gcloud storage ls "${GCS_MODEL_LOCATION}/**" | head -n 20

# Sanity-check the total size — expect tens of GB for 31B.
gcloud storage du -s "${GCS_MODEL_LOCATION}"
```

---

**Next →** [`step_06_vpc_network.md`](step_06_vpc_network.md)
