import { useEffect, useMemo, useRef, useState } from "react";

// ====== 設定 ======
const DEFAULT_BEHAVIORS = [
  "アルコール依存",
  "喫煙",
  "夜間徘徊",
  "ギャンブル",
  "暴力",
  "浪費",
  "引きこもり",
  "その他",
];

const API_BASE = (import.meta.env?.VITE_API_BASE ?? "https://fastapi-chatapp-tlqz.onrender.com").replace(/\/$/, "");
const CHAT_URL = `${API_BASE}/chat`;

export default function ChatUI() {
  const [phase, setPhase] = useState("setup"); // setup | chat
  const [behavior, setBehavior] = useState("");
  const [customBehavior, setCustomBehavior] = useState("");

  const [messages, setMessages] = useState(() => [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "こんにちは。左下の入力欄から送信してください。上部で選んだ『問題行動』の文脈で返答します。",
      ts: Date.now(),
    },
  ]);
  const [mode, setMode] = useState("free"); // free | qa
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const effectiveBehavior = useMemo(() => {
    if (!behavior) return "";
    return behavior === "その他" ? customBehavior.trim() || "その他" : behavior;
  }, [behavior, customBehavior]);

  async function send() {
    if (loading) return;
    setError("");

    let outgoing = "";
    if (mode === "free") {
      if (!text.trim()) return;
      outgoing = text.trim();
    } else {
      if (!q.trim() || !a.trim()) return;
      outgoing = `問題行動: ${effectiveBehavior}\n支援者の問い: ${q.trim()}\n当人の回答: ${a.trim()}`;
    }

    const userMsg = { id: crypto.randomUUID(), role: "user", content: outgoing, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setQ("");
    setA("");
    setLoading(true);

    try {
      const payload = {
        message: effectiveBehavior ? `[コンテキスト:問題行動=${effectiveBehavior}]\n${outgoing}` : outgoing,
      };

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${t}`);
      }
      const data = await res.json();
      const reply = typeof data === "object" && data?.response ? String(data.response) : JSON.stringify(data);
      const aiMsg = { id: crypto.randomUUID(), role: "assistant", content: reply, ts: Date.now() };
      setMessages((m) => [...m, aiMsg]);
    } catch (e) {
      console.error(e);
      setError("サーバー呼び出しに失敗しました。URLとCORS設定を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  // ====== 事前セットアップ画面 ======
  if (phase === "setup") {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-start justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
          <div className="px-6 py-5 border-b border-black/10 bg-[#1EA362] text-white">
            <div className="text-lg font-semibold">チャットを始める前に</div>
            <div className="text-xs opacity-90 mt-0.5">対象の「問題行動」を選んでください</div>
          </div>

          {/* 行動選択 */}
          <div className="px-6 py-5 space-y-4">
            <div className="text-sm font-medium">問題行動</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_BEHAVIORS.map((b) => {
                const selected = behavior === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBehavior(b)}
                    className={`px-3 py-1.5 rounded-full border text-sm shadow-sm transition font-semibold focus:outline-none focus:ring-2 focus:ring-[#1EA362]/50 ${
                      selected
                        ? "text-white border-[#1EA362]"
                        : "bg-white text-[#187A4F] border-[#1EA362] hover:bg-[#F0FDF4]"
                    }`}
                    style={selected ? { backgroundColor: "#1EA362", borderColor: "#1EA362", color: "#ffffff" } : undefined}
                  >
                    {b}
                  </button>
                );
              })}
            </div>

            {behavior === "その他" && (
              <div className="mt-2">
                <label className="text-xs text-black/60">具体名（任意）</label>
                <input
                  value={customBehavior}
                  onChange={(e) => setCustomBehavior(e.target.value)}
                  placeholder="例）ネット依存、深夜外出 など"
                  className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="pt-2">
              {/** チャット開始ボタン */}
              <StartButton enabled={!!behavior} onClick={() => setPhase("chat")} />
            </div>
          </div>

          <div className="px-6 pb-6 text-xs text-black/50 border-t border-black/10">
            * 選んだ内容はチャットの文脈に含めてサーバーへ送信されます。
          </div>
        </div>
      </div>
    );
  }

  // ====== チャット画面 ======
  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col">
      {/* ヘッダー */}
      <header className="h-14 flex items-center gap-3 px-4 bg-[#1EA362] text-white shadow">
        <div className="w-7 h-7 rounded-full bg-white/20 grid place-items-center text-[11px]">AI</div>
        <div className="flex flex-col">
          <span className="font-semibold leading-tight">Chat</span>
          <span className="text-[10px] opacity-90 leading-tight">online ・ 文脈: {effectiveBehavior || "未設定"}</span>
        </div>
        <div className="ml-auto text-[10px] px-2 py-1 rounded bg-white/10 border border-white/20">ENV: {import.meta.env?.VITE_API_BASE ? "env" : "default"}</div>
      </header>

      {/* メッセージ */}
      <main ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-[720px] flex flex-col gap-2">
          {messagesWithDate(messages).map((item) =>
            item._type === "date" ? (
              <div key={item.key} className="flex justify-center my-3">
                <span className="text-[10px] px-2 py-1 rounded-full bg-black/10 text-black/60">{item.label}</span>
              </div>
            ) : (
              <Bubble key={item.id} role={item.role} text={item.content} ts={item.ts} />
            )
          )}

          {loading && (
            <div className="flex items-end">
              <div className="mr-2 w-7 h-7 rounded-full bg-[#1EA362] grid place-items-center text-white text-[11px]">AI</div>
              <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm text-[15px]">
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center mt-2">
              <div className="text-[12px] px-3 py-2 rounded bg-rose-100 text-rose-700 border border-rose-200">{error}</div>
            </div>
          )}
        </div>
      </main>

      {/* 入力エリア */}
      <footer className="border-t border-black/10 bg-white px-3 py-2">
        <div className="mx-auto max-w-[720px] space-y-2">
          {/* モード切替 */}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setMode("free")}
              className={`px-2 py-1 rounded-full border ${mode === "free" ? "bg-black text-white border-black" : "bg-white border-black/20"}`}
            >
              通常メッセージ
            </button>
            <button
              onClick={() => setMode("qa")}
              className={`px-2 py-1 rounded-full border ${mode === "qa" ? "bg-black text-white border-black" : "bg-white border-black/20"}`}
            >
              Q&Aセット入力
            </button>
            <div className="ml-auto text-[10px] text-black/40">Enterで送信 / Shift+Enterで改行</div>
          </div>

          {mode === "free" ? (
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="メッセージを入力"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 max-h-36"
              />
              <button
                onClick={send}
                disabled={!text.trim() || loading}
                className="rounded-2xl px-4 h-10 bg-[#1EA362] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                送信
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.metaKey && send()}
                placeholder="支援者の問い（例：最近万引きしたくなったきっかけは？）"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
              <textarea
                value={a}
                onChange={(e) => setA(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="当人の回答（例：お金がなくて…）"
                rows={2}
                className="w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-sm max-h-36"
              />
              <div className="flex justify-end">
                <button
                  onClick={send}
                  disabled={!q.trim() || !a.trim() || loading}
                  className="rounded-2xl px-4 h-10 bg-[#1EA362] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  セットで送信
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function StartButton({ enabled, onClick }) {
  const base = "rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1EA362]/50";
  if (!enabled) {
    return (
      <button type="button" disabled className={`${base} bg-slate-200 text-slate-500 cursor-not-allowed`}>
        チャット開始
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} text-white border border-[#1EA362] hover:brightness-95`}
      style={{ backgroundColor: "#1EA362", borderColor: "#1EA362", color: "#ffffff" }}
    >
      チャット開始
    </button>
  );
}

// ====== サブコンポーネント ======
function messagesWithDate(list) {
  const out = [];
  let last = "";
  for (const m of list) {
    const d = new Date(m.ts);
    const label = d.toLocaleDateString();
    if (label !== last) {
      last = label;
      out.push({ _type: "date", key: `date-${label}`, label: label === new Date().toLocaleDateString() ? "Today" : label });
    }
    out.push(m);
  }
  return out;
}

function Bubble({ role, text, ts }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-2 w-7 h-7 rounded-full bg-[#1EA362] grid place-items-center text-white text-[11px]">AI</div>
      )}
      <div
        className={`max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm relative ${
          isUser ? "bg-[#C5ECBD] rounded-br-sm" : "bg-white rounded-bl-sm"
        }`}
      >
        <pre className="whitespace-pre-wrap break-words font-sans">{text}</pre>
        <div className={`text-[10px] opacity-60 mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <span
          className={`absolute -bottom-1 ${isUser ? "right-2 rotate-45 bg-[#C5ECBD]" : "left-2 -rotate-45 bg-white"} w-2 h-2 block`}
          style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}
        />
      </div>
      {isUser && (
        <div className="ml-2 w-7 h-7 rounded-full bg-[#8BC34A] grid place-items-center text-white text-[11px]">Me</div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
      <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce"></span>
      <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce [animation-delay:0.2s]"></span>
    </div>
  );
}
