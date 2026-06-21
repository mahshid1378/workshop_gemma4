# Step 99 — Tear everything down · L4 · E4B track

> # ⚠️ A FORGOTTEN SERVICE IS A $50+ SURPRISE
> # RUN THIS AFTER THE WORKSHOP.
>
> A GPU-backed Cloud Run service bills while instances run, and the bucket, VPC,
> and service account linger until you delete them. This step removes everything
> in **reverse order** of creation so there are no dangling dependencies.

> **What this does:** Deletes the Cloud Run service, the GCS bucket and its
> contents, the VPC subnet and network, and the service account.
>
> **Why it matters:** It's the difference between a ~$1–3 workshop and a $50+
> surprise next month.

| | |
|---|---|
| ⏱ **Time** | ~3 minutes |
| 💰 **Cost** | This is the step that **stops** the cost |

**Prerequisites**
- Your env vars are still set. If your Cloud Shell session dropped, re-paste
  [`step_01_env_vars.md`](step_01_env_vars.md) first so the names below resolve.

> ⚠️ **Sharing a project with the 12B L4 track?** The bucket and VPC are shared
> by name. If you still want the 12B track running, **skip the bucket/subnet/
> network/SA deletes** (steps 2–5 below) and only delete this service (step 1).
> Tear the shared resources down only when *both* L4 services are gone.

---

```bash
# 1. Delete the Cloud Run service. THIS is the one that costs money per hour —
#    do it first. --quiet skips the interactive confirmation prompt.
gcloud run services delete "${SERVICE_NAME}" \
  --region="${GOOGLE_CLOUD_REGION}" --quiet

# 2. Delete the bucket AND everything in it (the cached weights). The --recursive
#    flag removes all objects; without it, a non-empty bucket won't delete.
#    (Skip if the 12B L4 track is still using this shared bucket.)
gcloud storage rm --recursive "gs://${MODEL_CACHE_BUCKET}" --quiet

# 3. Delete the subnet (must go before the network it belongs to).
gcloud compute networks subnets delete "${VPC_SUBNET}" \
  --region="${GOOGLE_CLOUD_REGION}" --quiet

# 4. Delete the VPC network now that it's empty.
gcloud compute networks delete "${VPC_NETWORK}" --quiet

# 5. Delete the dedicated service account.
gcloud iam service-accounts delete "${SERVICE_ACCOUNT_EMAIL}" --quiet
```

> ℹ️ Order matters: service → bucket → subnet → network → SA. You can't delete a
> network while a subnet still lives in it, and there's no reason to keep the SA
> once the service that used it is gone.

---

## ✅ Verify (each should report "not found" or empty)

```bash
gcloud run services list --region="${GOOGLE_CLOUD_REGION}" --filter="metadata.name=${SERVICE_NAME}"
gcloud storage ls "gs://${MODEL_CACHE_BUCKET}" 2>&1 | head -n 1
gcloud compute networks list --filter="name=${VPC_NETWORK}"
gcloud iam service-accounts list --filter="email=${SERVICE_ACCOUNT_EMAIL}"
```

All four should come back empty / "not found" (minus anything you deliberately
kept for the 12B track). If so, you're cleaned up and billing has stopped.

> 💡 The APIs you enabled in step 2 stay enabled — that's free and harmless. If
> you created a throwaway project, the cleanest finish is to delete the whole
> project from the console.

---

🧹 Done. Thanks for joining the GDG Cloud Manila workshop!
