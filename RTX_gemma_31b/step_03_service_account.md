# Step 3 — Create a dedicated service account · RTX track

> **What this does:** Creates a new, purpose-built service account (SA) that the
> Cloud Run service will run as. Later (step 7) we grant it access to **only**
> the model bucket — nothing else.
>
> **Why it matters:** Cloud Run will happily run as the default Compute Engine
> SA, but that account is wildly over-privileged (often project-wide Editor). If
> the service is ever compromised, those broad permissions become the blast
> radius. A dedicated SA with least privilege keeps the damage contained — this
> is the single most important security habit in the whole workshop.

| | |
|---|---|
| ⏱ **Time** | ~1 minute |
| 💰 **Cost** | $0 — service accounts are free |

**Prerequisites**
- Step 1 done (`SERVICE_ACCOUNT` / `SERVICE_ACCOUNT_EMAIL` set)
- Step 2 done (`iam.googleapis.com` enabled)

---

```bash
# Create the service account. The display name is just for the console UI.
gcloud iam service-accounts create "${SERVICE_ACCOUNT}" \
  --display-name="vLLM Cloud Run service account (workshop)"

# Note: we grant NO project-level roles here on purpose. The only permission
# this SA needs is read access to the model bucket, and we scope that to the
# bucket itself in step 7 — not to the whole project.
```

---

## ✅ Verify

```bash
gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" \
  --format="value(email)"
```

It should print exactly:
`vllm-service-sa@<your-project>.iam.gserviceaccount.com`

---

**Next →** [`step_04_gcs_bucket.md`](step_04_gcs_bucket.md)
