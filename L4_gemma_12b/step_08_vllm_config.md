# Step 8 — Set the vLLM + Cloud Run tuning knobs · L4 · 12B track

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
# 32767 is a generous context that fits comfortably on the L4 with 12B at FP8.
export MAX_MODEL_LEN="32767"

# Quantize the WEIGHTS to FP8. 12B is ~28 GB in BF16 (too big for the L4's 24 GB!);
# FP8 brings it down to ~7-8 GB, which is exactly why FP8 is what makes 12B fit.
# Trade-off: a tiny, usually imperceptible quality drop for big memory savings.
export QUANTIZATION_TYPE="fp8"

# Quantize the KV CACHE to FP8 too. The KV cache grows with context length and
# concurrency; FP8 here lets us serve longer contexts / more sequences in the
# same VRAM. Same trade-off: minor precision loss, major capacity win.
export KV_CACHE_DTYPE="fp8"

# Fraction of GPU memory vLLM may claim for weights + KV cache.
# 0.92 = use 92%. 12B leaves less headroom on the L4 than E4B did, so we push
# slightly higher (0.92 vs E4B's 0.90) to reclaim KV-cache room — but not so high
# that we risk an OOM. This is the kind of knob you nudge per model+GPU pairing.
export GPU_MEM_UTIL="0.92"

# How many GPUs to shard the model across. Single GPU, so 1 (no tensor
# parallelism). You'd raise this only if a model didn't fit on one GPU.
export TENSOR_PARALLEL_SIZE="1"

# Max number of sequences vLLM batches CONCURRENTLY (continuous batching).
# 12B is bigger than E4B, so each sequence's KV cache costs more VRAM and fewer
# fit at once: we drop to 12 (vs E4B's 16). Bigger model -> narrower batch.
export MAX_NUM_SEQS="12"


# ===== Cloud Run sizing knobs =====

# The GPU SKU. THIS is the headline difference between tracks. L4 tracks use
# the budget-friendly NVIDIA L4; the RTX track uses nvidia-rtx-pro-6000.
export GPU_TYPE="nvidia-l4"

# vCPUs and memory for the container. GPU inference still needs ample CPU/RAM to
# feed the GPU (tokenization, scheduling, streaming weights from GCS). 12B + L4
# stays comfortable at the same 8 CPU / 32 GB as E4B — the GPU is the bottleneck,
# not CPU/RAM, so these don't need to change between the two L4 models.
export CLOUD_RUN_CPU_NUM="8"
export CLOUD_RUN_MEMORY_GB="32"

# How many simultaneous requests Cloud Run sends to ONE container instance.
# Rule of thumb: ~2x MAX_NUM_SEQS. vLLM's continuous batching keeps the GPU busy
# while some requests are still being scheduled, so a queue ~2x the batch size
# maximizes throughput without overwhelming the cache. We keep the same 2x ratio
# as E4B, so as MAX_NUM_SEQS dropped to 12, concurrency follows: 2 x 12 = 24.
export CLOUD_RUN_CONCURRENCY="24"

# Cap on how many instances Cloud Run will scale out to. Caps your worst-case
# spend: at most 3 GPUs running at once. For a workshop, 3 is plenty.
export CLOUD_RUN_MAX_INSTANCES="3"

# How long Cloud Run waits before it starts health-checking the container.
# 12B is ~1.5x larger than E4B and takes longer to stream + warm up, so we give
# it 180s (vs E4B's 120s). Too short and Cloud Run kills the container mid-load
# in a restart loop.
export STARTUP_PROBE_DELAY="180"
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

All values populated, `GPU_TYPE` = `nvidia-l4`, concurrency ≈ 2× seqs.

---

**Next →** [`step_09_deploy.md`](step_09_deploy.md)
