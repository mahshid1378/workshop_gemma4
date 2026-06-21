"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

const LS_KEY = "chat-tester-config";

// ----------------------------------------------------------------------------
// One independent chat box. Exposes sendMessage() to the parent via a ref so
// the "Send to all" broadcast can fire every box at once.
// ----------------------------------------------------------------------------
const ChatBox = forwardRef(function ChatBox(
  { index, conn, onRemove, canRemove },
  ref
) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState(conn.model);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, busy]);

  async function sendMessage(text) {
    const content = (text ?? "").trim();
    if (!content || busy) return;
    setError("");
    if (!conn.baseUrl.trim()) {
      setError("Set the Cloud Run URL in Settings (top bar).");
      return;
    }

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: conn.baseUrl.trim(),
          model: (model || conn.model).trim(),
          token: conn.token.trim() || undefined,
          messages: nextMessages,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + delta,
                };
                return copy;
              });
            }
          } catch {
            // partial / non-JSON line — ignore
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setMessages((m) => {
        const copy = [...m];
        if (copy.length && copy[copy.length - 1].content === "") copy.pop();
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  // Let the parent trigger this box (used by "Send to all").
  useImperativeHandle(ref, () => ({ sendMessage }));

  function submit() {
    const t = input;
    setInput("");
    sendMessage(t);
  }
  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="box">
      <div className="box-head">
        <span className="box-title">Chat {index + 1}</span>
        <input
          className="box-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          title="Model for this chat"
          placeholder="model"
        />
        {busy && <span className="dot" title="streaming" />}
        <button className="ghost xs" onClick={() => setMessages([])} title="Clear">
          Clear
        </button>
        {canRemove && (
          <button
            className="ghost xs danger"
            onClick={onRemove}
            title="Remove this chat"
          >
            ×
          </button>
        )}
      </div>

      <div className="box-chat" ref={scrollRef}>
        {messages.length === 0 && <div className="empty sm">Say hi 👋</div>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="error sm">{error}</div>}

      <div className="box-composer">
        <textarea
          rows={1}
          placeholder="Message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={submit} disabled={busy || !input.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
});

// ----------------------------------------------------------------------------
// Page: shared connection settings + a dynamic grid of chat boxes.
// ----------------------------------------------------------------------------
export default function Home() {
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("google/gemma-4-31B-it");
  const [token, setToken] = useState("");
  const [showSettings, setShowSettings] = useState(true);

  const [boxes, setBoxes] = useState([0]); // list of stable ids
  const [broadcast, setBroadcast] = useState("");
  const nextId = useRef(1);
  const boxRefs = useRef({}); // id -> { sendMessage }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (saved.baseUrl) setBaseUrl(saved.baseUrl);
      if (saved.model) setModel(saved.model);
      if (saved.token) setToken(saved.token);
      if (saved.baseUrl) setShowSettings(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ baseUrl, model, token }));
    } catch {}
  }, [baseUrl, model, token]);

  const conn = { baseUrl, model, token };

  function addBox() {
    const id = nextId.current++;
    setBoxes((b) => [...b, id]);
  }
  function removeBox(id) {
    setBoxes((b) => b.filter((x) => x !== id));
    delete boxRefs.current[id];
  }
  function sendToAll() {
    const text = broadcast.trim();
    if (!text) return;
    setBroadcast("");
    boxes.forEach((id) => boxRefs.current[id]?.sendMessage(text));
  }
  function onBroadcastKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendToAll();
    }
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <div>
          <h1>Cloud Run Chat Tester</h1>
          <p className="sub">
            Parallel chats to <code>{"{URL}/v1/chat/completions"}</code> · {boxes.length}{" "}
            {boxes.length === 1 ? "chat" : "chats"}
          </p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? "Hide" : "Settings"}
          </button>
        </div>
      </header>

      {showSettings && (
        <section className="settings">
          <label>
            Cloud Run URL <span className="hint">(base URL only — no /v1)</span>
            <input
              type="text"
              placeholder="https://your-service-xxxx.run.app"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
          <label>
            Default model <span className="hint">(each chat can override)</span>
            <input
              type="text"
              placeholder="google/gemma-4-31B-it"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label>
            Bearer token <span className="hint">(only if not public)</span>
            <input
              type="password"
              placeholder="optional — gcloud auth print-identity-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <div className="done-row">
            <button onClick={() => setShowSettings(false)}>Save</button>
          </div>
        </section>
      )}

      <section className="controls">
        <textarea
          className="broadcast"
          rows={1}
          placeholder="Message ALL chats at once…  (Enter to broadcast)"
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          onKeyDown={onBroadcastKey}
        />
        <button onClick={sendToAll} disabled={!broadcast.trim()}>
          Send to all
        </button>
        <button className="ghost add" onClick={addBox} title="Add a chat">
          + Add chat
        </button>
      </section>

      <section className="grid">
        {boxes.map((id, i) => (
          <ChatBox
            key={id}
            index={i}
            conn={conn}
            canRemove={boxes.length > 1}
            onRemove={() => removeBox(id)}
            ref={(el) => {
              if (el) boxRefs.current[id] = el;
              else delete boxRefs.current[id];
            }}
          />
        ))}
      </section>
    </main>
  );
}
