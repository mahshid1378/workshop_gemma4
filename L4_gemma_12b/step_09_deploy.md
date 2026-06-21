# Step 9 — Deploy to Cloud Run · L4 · 12B track

> ## 🤔 Why this looks weird — the `bash -c` + `^;^` pattern
> The vLLM container's default entrypoint is `python`, and we need to run
> `vllm serve` with many flags. Three tricks combine:
> 1. `CONTAINER_ARGS` is a bash array of flags.
> 2. We flatten it into one space-separated string (`CONTAINER_ARGS_STR`).
> 3. We pass it to Cloud Run as `bash -c "<the full vllm command>"`.
>
> The `"^;^"` prefix in `--args` tells gcloud to use **semicolons** as the
> delimiter (instead of the default comma), because the vLLM command can contain
> commas — semicolons let us pass the whole bash command as ONE argument cleanly.
>
> Don't simplify it to `--args="comma,separated,values"` — it parses wrong and
> the container won't start (`failed to start and listen on the port ... PORT=8080`).

> **What this does:** Assembles the vLLM server arguments into a `CONTAINER_ARGS`
> array, then runs a single `gcloud run deploy` that creates the GPU-backed Cloud
> Run service: it pulls the vLLM image, attaches an L4 GPU, loads the 12B weights
> from GCS over Direct VPC Egress, and exposes a standard `/v1/chat/completions` HTTP API.
>
> **Why it matters:** This is the payoff. Every variable from steps 1–8 comes
> together here. The first deploy is also the first **cold start**, so it takes a
> couple of minutes while the weights stream in — that's why step 8 set the
> startup probe delay.

| | |
|---|---|
| ⏱ **Time** | ~4–6 min (most of it is the first cold-start model load for 12B) |
| 💰 **Cost** | **Billing starts now** — ~$1.42/hr while an instance is running. Scales to zero when idle, but **run `step_99` after the workshop.** |

**Prerequisites**
- Steps 1–8 done (all env vars set, weights cached, SA granted, VPC ready)

---

### 1. Build the vLLM container arguments

```bash
# Build the `vllm serve` command as a bash array — one flag per line, readable.
# This mirrors the official codelab's structure.
CONTAINER_ARGS=(
    # positional: point vLLM at the GCS-cached weights (the Run:ai Model Streamer
    # reads them straight from GCS over Direct VPC Egress).
    "vllm" "serve" "${GCS_MODEL_LOCATION}"

    # serve under the short HF name so step 10 / the chat UI use "${MODEL_NAME}",
    # not the GCS path.
    "--served-model-name" "${MODEL_NAME}"

    # observability + throughput/latency features
    "--enable-log-requests"
    "--enable-chunked-prefill"
    "--enable-prefix-caching"
    "--generation-config" "auto"

    # function-calling + reasoning extraction (Gemma 4 parsers — NOT pythonic/gemma)
    "--enable-auto-tool-choice"
    "--tool-call-parser" "gemma4"
    "--reasoning-parser" "gemma4"

    # precision + memory knobs from step 8
    "--dtype" "bfloat16"
    "--quantization" "${QUANTIZATION_TYPE}"
    "--kv-cache-dtype" "${KV_CACHE_DTYPE}"
    "--max-num-seqs" "${MAX_NUM_SEQS}"
    "--gpu-memory-utilization" "${GPU_MEM_UTIL}"
    "--tensor-parallel-size" "${TENSOR_PARALLEL_SIZE}"

    # stream weights straight from GCS
    "--load-format" "runai_streamer"

    # bind the port Cloud Run's startup probe checks (REQUIRED)
    "--port" "8080"
    "--host" "0.0.0.0"
)

# Only pass --max-model-len if you set it in step 8; otherwise vLLM uses the
# model's own maximum context length.
if [[ "${MAX_MODEL_LEN}" != "" ]]; then
    CONTAINER_ARGS+=("--max-model-len" "${MAX_MODEL_LEN}")
fi

# Flatten to one space-separated string for `bash -c` (default IFS is fine —
# no fragile IFS=';' subshell trick).
export CONTAINER_ARGS_STR="${CONTAINER_ARGS[*]}"

# Eyeball it before deploying. Confirm --port 8080 --host 0.0.0.0 is present.
echo "Deployment string: ${CONTAINER_ARGS_STR}"
```

### 2. Deploy

```bash
gcloud beta run deploy "${SERVICE_NAME}" \
  --image="us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:gemma4" \
  --project "${GOOGLE_CLOUD_PROJECT}" \
  --region "${GOOGLE_CLOUD_REGION}" \
  --service-account "${SERVICE_ACCOUNT_EMAIL}" \
  --execution-environment gen2 \
  --no-allow-unauthenticated \
  --cpu="${CLOUD_RUN_CPU_NUM}" \
  --memory="${CLOUD_RUN_MEMORY_GB}Gi" \
  --gpu=1 \
  --gpu-type="${GPU_TYPE}" \
  --no-gpu-zonal-redundancy \
  --no-cpu-throttling \
  --cpu-boost \
  --max-instances ${CLOUD_RUN_MAX_INSTANCES} \
  --concurrency ${CLOUD_RUN_CONCURRENCY} \
  --network ${VPC_NETWORK} \
  --subnet ${VPC_SUBNET} \
  --vpc-egress all-traffic \
  --set-env-vars "MODEL_NAME=${MODEL_NAME}" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}" \
  --set-env-vars "GOOGLE_CLOUD_REGION=${GOOGLE_CLOUD_REGION}" \
  --port=8080 \
  --timeout=3600 \
  --startup-probe tcpSocket.port=8080,initialDelaySeconds=${STARTUP_PROBE_DELAY},failureThreshold=40,timeoutSeconds=10,periodSeconds=15 \
  --command "bash" \
  --args="^;^-c;${CONTAINER_ARGS_STR}"
```

**What the interesting flags do:**

- `--image …:gemma4` — the Vertex AI Model Garden vLLM image, **pinned** to the
  `gemma4` tag. Don't bump this; it's the version tested for this workshop.
- `--command "bash"` + `--args` — run the flattened vLLM command via `bash -c`
  (see the note at the top of this step for why).
- `--gpu=1` + `--gpu-type` — attach one L4. **This is the headline difference
  between tracks**; the RTX track passes `nvidia-rtx-pro-6000` here instead.
- `--no-allow-unauthenticated` — keeps the endpoint **private** (the default, and
  what the official codelab does): only callers with an identity token and the
  `run.invoker` role get in. Step 10 calls it with your `gcloud` token. To make it
  public instead, see the optional section below.
- `--no-cpu-throttling` — keep the CPU fully powered even between requests. GPU
  inference needs the CPU responsive to feed the GPU; throttled CPU = stalls.
- `--cpu-boost` — extra CPU during startup so the container boots and loads the
  model faster.
- `--no-gpu-zonal-redundancy` — single-zone GPU, which is cheaper. Fine for a
  workshop; production might want zonal redundancy for availability.
- `--execution-environment=gen2` — the second-gen sandbox; **required** for GPU
  workloads.
- `--network` / `--subnet` / `--vpc-egress=all-traffic` — attach to our VPC and
  route **all** outbound traffic through it. This is what turns on Direct VPC
  Egress so GCS reads stay on Google's internal network (fast cold starts).
- `gcloud beta run deploy` + `--project` / `--region` — matches the official
  codelab (Cloud Run GPU lives on the beta surface) and pins project/region
  explicitly instead of relying on `gcloud config`.
- `--timeout=3600` — max request timeout (60 min); headroom for long generations
  and the first cold start.
- `--set-env-vars MODEL_NAME / GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_REGION` —
  passed into the container for logging/labeling.
- `--startup-probe` — `initialDelaySeconds=${STARTUP_PROBE_DELAY}` is the initial
  grace period (set per track in step 8); `failureThreshold=40, periodSeconds=15`
  then allow ~10 more minutes of retries — generous on purpose, because the first
  cold start has to stream the weights from GCS before the port opens.

---

## (Optional) Make it public — ⚠️ removes all auth

By default the service is **private** (above): only callers with a `gcloud`
identity token and the `run.invoker` role can reach it ([Step 10](step_10_test.md)
shows how). That's the recommended posture and matches the codelab.

**Only if** you want a public URL — e.g. to use the [Step 11](step_11_hollama.md)
browser chat UI, or to share a demo link — grant `allUsers` the invoker role:

```bash
gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project="${GOOGLE_CLOUD_PROJECT}" \
    --region="${GOOGLE_CLOUD_REGION}"
```

> ⚠️ **This makes your endpoint callable by anyone on the internet.** Prompts may
> be logged and you pay for any traffic it attracts. Do it only for a live demo,
> and **undo it right after**:
> ```bash
> gcloud run services remove-iam-policy-binding "$SERVICE_NAME" \
>     --member="allUsers" --role="roles/run.invoker" \
>     --region="${GOOGLE_CLOUD_REGION}"
> ```
> If the add command errors about *domain restricted sharing* /
> `iam.allowedPolicyMemberDomains`, your org blocks public services — stay on the
> private + token path. See [`SECURITY.md`](../SECURITY.md).

---

## ✅ Verify

```bash
# Should report the service as Ready / serving 100% of traffic.
gcloud run services describe "${SERVICE_NAME}" \
  --region="${GOOGLE_CLOUD_REGION}" \
  --format="value(status.conditions[0].type, status.conditions[0].status, status.url)"
```

If it's not Ready yet, watch the logs while it loads:

```bash
gcloud run services logs read "${SERVICE_NAME}" --region="${GOOGLE_CLOUD_REGION}" --limit=50
```

---

## 🔧 Troubleshooting

### Failure mode 1 — "Container failed to start and listen on the port ... PORT=8080"
Most common cause: `--port 8080` missing from `CONTAINER_ARGS`, or
`CONTAINER_ARGS_STR` got mangled during copy-paste. Verify first:
```bash
echo "${CONTAINER_ARGS_STR}"
```
It should contain `--port 8080 --host 0.0.0.0` near the end. If missing, re-run
the `CONTAINER_ARGS` block at the top of this step.

### Failure mode 2 — "Container failed to become healthy. Startup probes timed out after 14m"
Pull the container logs to see what really happened:
```bash
gcloud run services logs read $SERVICE_NAME \
    --project "${GOOGLE_CLOUD_PROJECT}" \
    --region "${GOOGLE_CLOUD_REGION}" \
    --limit=200
```
Common error patterns:

**A) "Network is unreachable" reaching storage.googleapis.com** → VPC subnet missing Private Google Access.
```bash
gcloud compute networks subnets describe $VPC_SUBNET \
    --region "${GOOGLE_CLOUD_REGION}" \
    --format="value(privateIpGoogleAccess)"
```
If `False`, fix it:
```bash
gcloud compute networks subnets update $VPC_SUBNET \
    --region "${GOOGLE_CLOUD_REGION}" \
    --enable-private-ip-google-access
```

**B) "Unknown tool call parser" / "Unknown reasoning parser"** → must be exactly `gemma4` (not `pythonic` or `gemma`).

**C) OOM / CUDA out of memory** → reduce `GPU_MEM_UTIL` (e.g. 0.90 instead of 0.95), or reduce `MAX_MODEL_LEN`, or reduce `MAX_NUM_SEQS`.

### Failure mode 3 — Long initial cold start (12–15+ min)
First-ever deploy can be slow if the model isn't yet warm in the streamer's cache.
Bump `--startup-probe initialDelaySeconds`:
```bash
--startup-probe="initialDelaySeconds=480,timeoutSeconds=10,periodSeconds=15,failureThreshold=40,tcpSocket.port=8080"
```
Gives 8 min initial + 10 min probing = 18 min total.

---

**Next →** [`step_10_test.md`](step_10_test.md)
