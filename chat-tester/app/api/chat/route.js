// Server-side proxy to the Cloud Run vLLM endpoint.
// The browser talks to this route (same-origin) instead of hitting Cloud Run
// directly — that sidesteps CORS, since the vLLM server sends no CORS headers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { baseUrl, model, messages, token } = body;

  if (!baseUrl) {
    return Response.json({ error: "Missing Cloud Run URL." }, { status: 400 });
  }
  if (!model) {
    return Response.json({ error: "Missing model name." }, { status: 400 });
  }

  // Normalize: strip trailing slashes AND an optional trailing /v1 (so users can
  // paste either "https://...run.app" or "https://...run.app/v1"), then append
  // the full path ourselves.
  const cleanBase = baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
  const target = `${cleanBase}/v1/chat/completions`;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let upstream;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 512,
        stream: true,
      }),
    });
  } catch (err) {
    return Response.json(
      { error: `Could not reach ${target}: ${err.message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return Response.json(
      {
        error: `Upstream returned ${upstream.status} ${upstream.statusText}. ${text.slice(0, 500)}`,
      },
      { status: upstream.status || 502 }
    );
  }

  // Pipe the SSE stream straight back to the browser.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
