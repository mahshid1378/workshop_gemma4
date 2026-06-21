# Cloud Run Chat Tester

A lightweight Next.js chat UI for testing the Gemma / vLLM endpoint you deployed
to Cloud Run in this workshop. It sends messages to
`{YOUR_URL}/v1/chat/completions` and streams the reply, so you can chat with your
model in a browser instead of `curl`.

## Run it

```bash
cd chat-tester
npm install
npm run dev
```

Open <http://localhost:3000>, then in **Settings**:

1. **Cloud Run URL** — your service URL, e.g. `https://gemma-xxxx.run.app`
   (the `echo $SERVICE_URL` value from step 10). No trailing `/v1/...` — just the base.
2. **Model name** — the short name you served with (`--served-model-name`), e.g.
   `google/gemma-4-12B-it`. **Not** the GCS path.
3. **Bearer token** — leave blank if the service is public. If your org blocks
   public access, paste the output of `gcloud auth print-identity-token`.

Settings are saved in your browser's localStorage, so you only paste them once.

## How it works

The browser never calls Cloud Run directly — vLLM sends no CORS headers, so that
would be blocked. Instead the page POSTs to a local Next.js route
(`app/api/chat/route.js`) which proxies the request server-side and pipes the
streaming SSE response back to the browser.

## Notes

- Streaming is always on; tokens appear as the model generates them.
- `max_tokens` is fixed at 512 in `app/api/chat/route.js` — change it there if needed.
- First message after the service scales to zero will be slow (cold start + model load).
