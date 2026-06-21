# Step 6 — Create the VPC + subnet for Direct VPC Egress · L4 · 12B track

> **What this does:** Creates a private VPC network and a subnet that Cloud Run
> will attach to. This enables **Direct VPC Egress** — Cloud Run sends its
> outbound traffic straight through your VPC.
>
> **Why it matters:** With Direct VPC Egress, Cloud Run reads the weights from
> GCS over Google's **internal** network instead of taking a public internet
> hop. Internal routing is faster and more consistent, which directly shrinks
> cold-start time. (No Serverless VPC Connector needed; Cloud Run attaches to the
> subnet directly.)

| | |
|---|---|
| ⏱ **Time** | ~2 minutes |
| 💰 **Cost** | $0 for the network itself; you pay only for egress you actually use |

**Prerequisites**
- Step 1 done (`VPC_NETWORK`, `VPC_SUBNET`, `SUBNET_RANGE`, `GOOGLE_CLOUD_REGION` set)
- Step 2 done (`compute.googleapis.com` enabled)

> ℹ️ Sharing a project with the E4B L4 track? Same VPC names → whoever runs this
> first creates them; the second run will say "already exists", which is fine.

---

```bash
# 1. Create the VPC in "custom subnet" mode so we control the subnet ourselves
#    (rather than auto-creating one subnet per region).
gcloud compute networks create "${VPC_NETWORK}" \
  --subnet-mode=custom

# 2. Create a single subnet in our region with the private /26 range from step 1.
#    Cloud Run will attach to THIS subnet for Direct VPC Egress.
gcloud compute networks subnets create "${VPC_SUBNET}" \
  --network="${VPC_NETWORK}" \
  --region="${GOOGLE_CLOUD_REGION}" \
  --range="${SUBNET_RANGE}"
```

> ℹ️ We don't open any firewall rules here. Cloud Run's egress to Google APIs
> (like GCS) doesn't need an ingress rule, and we're not running anything that
> accepts inbound VPC traffic.

---

## ✅ Verify

```bash
gcloud compute networks subnets describe "${VPC_SUBNET}" \
  --region="${GOOGLE_CLOUD_REGION}" \
  --format="value(name, network, ipCidrRange)"
```

Expect the subnet name, a URL ending in `/networks/vllm-...-net`, and
`10.8.0.0/26`.

---

**Next →** [`step_07_bucket_iam.md`](step_07_bucket_iam.md)
