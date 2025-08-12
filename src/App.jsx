import { useState, useRef, useEffect } from "react";

// ▶️ Backend endpoint
// Prefer .env: VITE_API_BASE=https://fastapi-chatapp-tlqz.onrender.com
const API_BASE = import.meta.env?.VITE_API_BASE ?? "https://fastapi-chatapp-tlqz.onrender.com";
const CHAT_URL = `${API_BASE.replace(/\/$/, "")}/chat`;

export default function ChatApp() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "支援者UIです。左下にメッセージを入力して送信すると、FastAPI経由で問い返しが返ります。",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError("");
    setLoading(true);

    // Add user message optimistically
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText} - ${text}`);
      }

      const data = await res.json();
      const reply = typeof data === "object" && data?.response ? String(data.response) : JSON.stringify(data);

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error(e);
      setError("サーバー呼び出しに失敗しました。CORS設定やURLを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center text-sm font-semibold">QA</div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">支援者チャット（FastAPI連携）</h1>
            <p className="text-xs text-slate-500">POST: {CHAT_URL}</p>
          </div>
          <EnvBadge />
        </div>

        {/* Messages */}
        <div ref={listRef} className="h-[54vh] overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">応答を生成中…</span>
            </div>
          )}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-end gap-3">
            <textarea
              className="flex-1 resize-none rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 px-3 py-2 text-sm leading-6 max-h-40 min-h-[44px]"
              placeholder="例）うるさくてキレた"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
              title="送信"
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm border ${
          mine
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function EnvBadge() {
  const showingDefault = !import.meta.env?.VITE_API_BASE;
  return (
    <span
      className={`text-[10px] px-2 py-1 rounded-lg border ${
        showingDefault ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
      title={showingDefault ? "環境変数 VITE_API_BASE が未設定（デフォルトURLを使用）" : "環境変数 VITE_API_BASE を使用中"}
    >
      {showingDefault ? "DEFAULT URL" : "ENV URL"}
    </span>
  );
}
