# Step 10 — Test the endpoint · L4 · E4B track

> **What this does:** Grabs the service URL and sends three chat-completion
> requests against the model's `/v1/chat/completions` API: a non-streaming English prompt, a
> streaming English prompt (so you see the Server-Sent Events format), and a
> Tagalog prompt to show Gemma 4's multilingual ability.
>
> **Why it matters:** This proves the whole pipeline works end-to-end — and it's
> the fun part. You're now talking to a Gemma 4 model running on your own Cloud
> Run GPU.

| | |
|---|---|
| ⏱ **Time** | ~3 minutes |
| 💰 **Cost** | Negligible per request; the GPU instance is what costs (already running) |

**Prerequisites**
- Step 9 done and the service is **Ready**

---

### Get the service URL

```bash
# Capture the public HTTPS URL into a variable we reuse below.
export SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${GOOGLE_CLOUD_REGION}" \
  --format="value(status.url)")
echo "Service URL: $SERVICE_URL"
```

> 🔐 **Auth:** Step 9 deploys the service **private**, so these calls include
> `-H "Authorization: Bearer $(gcloud auth print-identity-token)"` to authenticate
> as you (the token lasts ~1 hour — re-run if you later get `401`). If you opted
> into **public** access (Step 9's optional section), you can drop that header.

### Test 1 — Non-streaming (English)

```bash
# Standard chat completion. "stream": false -> we get one JSON object back.
# The "model" field is the short HF name the server registered in step 9
# (--served-model-name=${MODEL_NAME}) — NOT the GCS path.
curl -sS "${SERVICE_URL}/v1/chat/completions" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL_NAME}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"In one sentence, what is Cloud Run?\"}],
    \"max_tokens\": 128,
    \"stream\": false
  }" | jq -r '.choices[0].message.content'
# jq extracts just the assistant's text from the JSON envelope.
```

### Test 2 — Streaming (English, Server-Sent Events)

```bash
# "stream": true -> the server sends incremental "data: {...}" SSE chunks as the
# model generates. --no-buffer lets curl print them as they arrive (live typing).
curl -sS --no-buffer "${SERVICE_URL}/v1/chat/completions" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL_NAME}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Explain vLLM continuous batching to a beginner in 3 short bullet points.\"}],
    \"max_tokens\": 256,
    \"stream\": true
  }"
# You'll see a stream of "data: {...}" lines, each with a token delta, ending in
# "data: [DONE]". That raw SSE format is exactly what a chat UI consumes.
```

### Test 3 — Tagalog (multilingual)

```bash
# Gemma 4 is strongly multilingual. Same endpoint, a Tagalog prompt.
curl -sS "${SERVICE_URL}/v1/chat/completions" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL_NAME}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Magbigay ng tatlong dahilan kung bakit maganda ang Cloud Run para sa mga startup sa Pilipinas.\"}],
    \"max_tokens\": 256,
    \"stream\": false
  }" | jq -r '.choices[0].message.content'
# Expect a fluent Tagalog answer — even the compact E4B handles this well.
```

---

## ✅ Verify

- Test 1 returns a clean one-sentence English answer.
- Test 2 streams visible `data:` chunks ending in `[DONE]`.
- Test 3 answers in fluent Tagalog.

If any call hangs on the first try, the instance may have scaled to zero and is
cold-starting — wait for the model load and retry.

---

## 🔧 Troubleshooting

**1. `jq: parse error: Invalid numeric literal`.**
The response isn't JSON. Drop the `jq` pipe and add `-i` to see the raw output:
```bash
curl -i "$SERVICE_URL/v1/chat/completions" -H "Content-Type: application/json" -d '...'
```
Common cause: using `${GCS_MODEL_LOCATION}` instead of `${MODEL_NAME}` in the
request body — the server only knows the model by its short name. Another common
cause: `-i` shows `HTTP/2 403` with an **HTML** body — the service isn't public
(see item 2), so `jq` chokes on the HTML.

**2. HTTP 403 Forbidden / 401 Unauthorized — rejected by Google Frontend before it reaches vLLM.**
The service isn't publicly invokable. (This happens even with `--allow-unauthenticated`
if an org policy blocked the `allUsers` binding at deploy time.) Make it public:
```bash
gcloud run services add-iam-policy-binding $SERVICE_NAME \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project="${GOOGLE_CLOUD_PROJECT}" \
    --region="${GOOGLE_CLOUD_REGION}"
```
If that errors mentioning *domain restricted sharing* / `iam.allowedPolicyMemberDomains`,
your org blocks public services — call the endpoint with your own identity token instead:
```bash
curl -sS "$SERVICE_URL/v1/chat/completions" \
    -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
    -H "Content-Type: application/json" \
    -d '{"model":"'"${MODEL_NAME}"'","messages":[{"role":"user","content":"test"}]}'
```

**3. Still HTTP 403 with a valid token.**
Your account lacks the invoker role. Grant it to yourself:
```bash
gcloud run services add-iam-policy-binding $SERVICE_NAME \
    --member="user:$(gcloud config get-value account)" \
    --role="roles/run.invoker" --region="${GOOGLE_CLOUD_REGION}"
```

**4. Cloud Shell heredoc gets stuck (shows `>` indefinitely).**
A Cloud Shell paste artifact mangled the multi-line JSON. Press Ctrl+C and use
this single-line version:
```bash
curl -i "$SERVICE_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d '{"model":"'"${MODEL_NAME}"'","messages":[{"role":"user","content":"test"}]}'
```

---

> 🎉 You just served Gemma 4 E4B on a Cloud Run L4 GPU — same stack the speaker
> is running at 31B scale. Same commands, smaller numbers. Curious how much more
> a bigger model gives you? The 12B L4 track (`L4_gemma_12b/`) is the same recipe
> with Google's newest mid-size Gemma 4.

**Next →** *(optional)* [`step_11_hollama.md`](step_11_hollama.md) to chat through a UI — then [`step_99_cleanup.md`](step_99_cleanup.md) — **don't skip cleanup.**
