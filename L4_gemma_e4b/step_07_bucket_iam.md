# Step 7 — Grant the service account access to the bucket · L4 · E4B track

> ## ⏭️ OPTIONAL — only for Option B (your own bucket)
> **Skip this step if you chose Option A** (the speaker's shared bucket) in
> [`step_01_env_vars.md`](step_01_env_vars.md) — jump to the next required step,
> [`step_08_vllm_config.md`](step_08_vllm_config.md). This step is only needed if
> you're caching your own model in your own bucket (Option B).

> **What this does:** Gives the dedicated service account from step 3 permission
> on the model bucket from step 4 — and **only** that bucket. We bind the role at
> the bucket level, not the project level.
>
> **Why it matters:** This is least privilege in action. The Cloud Run service
> needs to read the cached weights, so it gets access to exactly one bucket and
> nothing else in the project. If the service is ever compromised, the attacker
> can touch the model files and that's it — not your other buckets, not your
> compute, not your billing.

| | |
|---|---|
| ⏱ **Time** | ~1 minute |
| 💰 **Cost** | $0 |

**Prerequisites**
- Step 3 done (`SERVICE_ACCOUNT_EMAIL` exists)
- Step 4 done (`MODEL_CACHE_BUCKET` exists)

---

```bash
# Bind the role on the BUCKET resource (note: gcloud storage buckets add-iam-policy-binding),
# NOT on the project. That scoping is the whole point.
gcloud storage buckets add-iam-policy-binding "gs://${MODEL_CACHE_BUCKET}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.admin"

# Why storage.admin (and not just objectViewer)? The Run:ai Model Streamer that
# vLLM uses lists and reads objects and benefits from full bucket-scoped access
# during streaming. Because the binding is scoped to THIS bucket only, "admin"
# here still means "admin of one bucket of model weights" — not the project.
```

---

## ✅ Verify

```bash
gcloud storage buckets get-iam-policy "gs://${MODEL_CACHE_BUCKET}" \
  --format=json | grep -A3 "storage.admin"
```

You should see `serviceAccount:vllm-service-sa@...` listed under the
`roles/storage.admin` binding.

---

**Next →** [`step_08_vllm_config.md`](step_08_vllm_config.md)
