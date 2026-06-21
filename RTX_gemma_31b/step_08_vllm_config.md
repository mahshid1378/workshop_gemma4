# Step 8 — Set the vLLM + Cloud Run tuning knobs · RTX track

> **What this does:** Defines the variables that control how vLLM loads the model
> and how Cloud Run sizes the container. No resources are created yet — we're
> just setting values that step 9 plugs into the deploy command.
>
> **Why it matters:** This is the **teaching moment** of the workshop. Every knob
> here is a memory/throughput/latency trade-off. The exact same set of knobs
> appears in all three tracks — only the *numbers* differ between a phone-sized
> model on an L4 and a 31B model on an RTX. Understand these and you can deploy
> *any* model on *any* GPU.

| | |
|---|---|
| ⏱ **Time** | ~3 minutes (mostly reading) |
| 💰 **Cost** | $0 — nothing created yet |

**Prerequisites**
- Steps 1–7 done (env vars set, bucket cached, SA granted)

---

```bash
# ===== vLLM model-serving knobs =====

# Max sequence length (prompt + generated tokens) the server will accept.
# This is really a KV-CACHE MEMORY BUDGET: vLLM pre-reserves cache for this many
# tokens per sequence. Bigger = longer contexts but more VRAM per request.
# 32767 is a generous context that still leaves room on the RTX.
export MAX_MODEL_LEN="32767"

# Quantize the WEIGHTS to FP8. The 31B model is ~62 GB in BF16; FP8 roughly
# halves that, so it fits comfortably on the RTX with cache headroom to spare.
# Trade-off: a tiny, usually imperceptible quality drop for big memory savings.
export QUANTIZATION_TYPE="fp8"

# Quantize the KV CACHE to FP8 too. The KV cache grows with context length and
# concurrency; FP8 here lets us serve longer contexts / more sequences in the
# same VRAM. Same trade-off: minor precision loss, major capacity win.
export KV_CACHE_DTYPE="fp8"

# Fraction of GPU memory vLLM is allowed to claim for weights + KV cache.
# 0.95 = use 95%, leaving 5% headroom for CUDA context, fragmentation, activations.
# Too high -> OOM at load or under load; too low -> wasted capacity. The RTX has
# plenty of VRAM, so we push to 0.95.
export GPU_MEM_UTIL="0.95"

# How many GPUs to shard the model across. We use a SINGLE GPU, so 1 (no tensor
# parallelism). You'd raise this only if a model didn't fit on one GPU.
export TENSOR_PARALLEL_SIZE="1"

# Max number of sequences vLLM batches CONCURRENTLY (continuous batching).
# Higher = more throughput but more KV-cache pressure. 31B is big, so we keep
# this modest at 8 to protect VRAM. (L4 tracks run smaller models -> higher.)
export MAX_NUM_SEQS="8"


# ===== Cloud Run sizing knobs =====

# The GPU SKU. THIS is the headline difference between tracks. RTX track uses the
# high-end RTX PRO 6000; L4 tracks use nvidia-l4.
export GPU_TYPE="nvidia-rtx-pro-6000"

# vCPUs and memory for the container. GPU inference still needs ample CPU/RAM to
# feed the GPU (tokenization, scheduling, streaming weights from GCS). The 31B +
# RTX gets a generous 20 CPU / 80 GB.
export CLOUD_RUN_CPU_NUM="20"
export CLOUD_RUN_MEMORY_GB="80"

# How many simultaneous requests Cloud Run sends to ONE container instance.
# Rule of thumb: ~2x MAX_NUM_SEQS. vLLM's continuous batching keeps the GPU busy
# while some requests are still being scheduled, so a queue ~2x the batch size
# maximizes throughput without overwhelming the cache. 2 x 8 = 16.
export CLOUD_RUN_CONCURRENCY="16"

# Cap on how many instances Cloud Run will scale out to. Caps your worst-case
# spend: at most 3 GPUs running at once. For a workshop, 3 is plenty.
export CLOUD_RUN_MAX_INSTANCES="3"

# How long Cloud Run waits before it starts health-checking the container.
# Loading 31B weights from GCS + warming CUDA takes a while, so we give it 240s.
# Too short and Cloud Run kills the container mid-load in a restart loop.
export STARTUP_PROBE_DELAY="240"
```

> **Why is `CLOUD_RUN_CONCURRENCY` double `MAX_NUM_SEQS`?**
> `MAX_NUM_SEQS` is how many sequences the **GPU** decodes at once. `CONCURRENCY`
> is how many requests **Cloud Run** hands the instance at once. Setting
> concurrency a bit higher than the batch size keeps a small queue of work ready,
> so the moment a sequence finishes, the next one slots straight in and the GPU
> never idles. Setting it *equal* would starve the batcher between requests;
> setting it *way* higher just builds latency. ~2x is the sweet spot.

---

## ✅ Verify

```bash
echo "MAX_MODEL_LEN=$MAX_MODEL_LEN  QUANT=$QUANTIZATION_TYPE  KV=$KV_CACHE_DTYPE"
echo "GPU=$GPU_TYPE  MEM_UTIL=$GPU_MEM_UTIL  TP=$TENSOR_PARALLEL_SIZE"
echo "MAX_NUM_SEQS=$MAX_NUM_SEQS  CONCURRENCY=$CLOUD_RUN_CONCURRENCY (should be ~2x)"
echo "CPU=$CLOUD_RUN_CPU_NUM  MEM_GB=$CLOUD_RUN_MEMORY_GB  STARTUP=$STARTUP_PROBE_DELAY"
```

All values populated, `GPU_TYPE` = `nvidia-rtx-pro-6000`, concurrency ≈ 2×
seqs.

---

**Next →** [`step_09_deploy.md`](step_09_deploy.md)
