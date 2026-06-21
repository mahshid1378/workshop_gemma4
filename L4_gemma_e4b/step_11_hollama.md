# Step 11 — Chat through a UI: Hollama (optional) · L4 · E4B track

> **What this does:** Your service is live at a **public HTTPS URL** (the one from
> Step 10). This step points **Hollama** — a free, browser-based chat UI — at that
> URL so you can talk to your model in a chat window instead of with `curl`.
>
> **Why it matters:** It turns "it returns JSON" into "it feels like a chat app,"
> and it's the easiest way to demo your endpoint to someone else.

| | |
|---|---|
| ⏱ **Time** | ~5 minutes |
| 💰 **Cost** | $0 extra — your Cloud Run service bills the same whether you call it from curl or a UI |

**Prerequisites**
- Step 9 done; the service is **Ready** and was deployed with `--allow-unauthenticated`
- Your **public service URL** from Step 10 (looks like `https://gemma-l4-e4b-...run.app`)
- Your model's short name: `google/gemma-4-E4B-it`

> ℹ️ Hollama needs nothing but your **public service URL with `/v1` on the end** —
> it chats with your **Gemma** service over plain HTTP. No install, no account.

---

> ## ⚠️ IMPORTANT — this endpoint is public and unauthenticated
> Anyone who knows the URL can call your service, and the speaker's logs capture
> every prompt sent through the endpoint.
>
> **DO test with:**
> - Generic prompts ("Why is the sky blue?")
> - Multilingual prompts ("Magbigay ng tatlong rason...")
> - Code questions ("How do I deploy to Cloud Run?")
>
> **DO NOT paste:**
> - Real customer data or PII
> - API keys, passwords, or tokens
> - Internal company documents under NDA
> - Private code you don't own
> - Content that may violate the Gemma Prohibited Use Policy
>
> **After the workshop, remove public access:**
> ```bash
> gcloud run services remove-iam-policy-binding $SERVICE_NAME \
>     --member="allUsers" --role="roles/run.invoker" \
>     --region="${GOOGLE_CLOUD_REGION}"
> ```

---

## Chat with Hollama (zero install, browser-based)

> **Prerequisite — public access required.** Hollama runs in your browser and
> can't send a Google identity token, so it only works if you enabled the
> **optional public-access path** in [Step 9](step_09_deploy.md) (`allUsers` →
> `roles/run.invoker`). Kept the default **private** deploy? Hollama can't reach
> the service — use Step 10's token `curl` instead. (And if you do enable public
> access, **remember to remove it after**.)

```bash
# 1. Open https://hollama.fernando.is in a browser
# 2. Settings (gear icon) -> under "Servers", set Connection type to "OpenAI"
#    -- NOT Ollama. vLLM speaks the /v1 API; it is NOT an Ollama server. ("OpenAI"
#    is just Hollama's label for a standard /v1 endpoint — your model is Gemma.)
#    Then click "Add connection".
# 3. Base URL: your public Cloud Run URL with /v1 on the end:
#    https://<your-cloud-run-url>/v1
# 4. API key: type anything (e.g. "workshop-demo") — vLLM ignores it, but Hollama
#    requires a non-empty value.
# 5. (Optional) Model names filter: gemma
# 6. Click Verify -> your Gemma model (google/gemma-4-E4B-it) appears. Then chat.
```

---

## ✅ Verify
- Your Gemma model appears in Hollama after refreshing the model list, and replies.

## 🔧 Troubleshooting
- **"Connection failed to verify" / empty model list** → check three things: the
  **Connection type is "OpenAI"** (not Ollama — vLLM isn't an Ollama server), the
  **Base URL ends with `/v1`**, and the **service is public** (Step 10
  troubleshooting — `allUsers` + `roles/run.invoker`).
- **403 errors** → the service isn't publicly invokable. Hollama can't send a
  Google identity token from the browser, so the service must be public.
- **Streaming feels slow** → that's expected first-token latency, not a bug.

## 🧹 Cleanup
Nothing to tear down — just close the browser tab.

---

**Next →** [`step_99_cleanup.md`](step_99_cleanup.md)
