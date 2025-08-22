import { useEffect, useMemo, useRef, useState } from "react";

// ✅ 使い方
// 1) Vite(TS/JS) どちらでもOK。Tailwindが有効なプロジェクトを想定
// 2) このファイルを src/ChatUI.jsx として保存
// 3) src/App.jsx で <ChatUI /> を描画
// 4) .env に VITE_API_BASE=https://fastapi-chatapp-tlqz.onrender.com を設定
// 5) サーバー側は POST `${VITE_API_BASE}/chat` で { message } を受ける前提

export default function ChatUI() {
  const [messages, setMessages] = useState(() => [
    // 初期メッセージ（不要なら空配列でもOK）
    { id: crypto.randomUUID(), role: "assistant", content: "こんにちは！なんでも話しかけてください。", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  // 自動スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // 日付セパレータ用に日付キーを作成
  const itemsWithDateBreaks = useMemo(() => {
    const out = [];
    let lastDate = "";
    for (const m of messages) {
      const d = new Date(m.ts);
      const key = d.toLocaleDateString();
      if (key !== lastDate) {
        lastDate = key;
        out.push({ _type: "date", key: `date-${key}` });
      }
      out.push(m);
    }
    return out;
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setError("");
    setLoading(true);

    const userMsg = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const base = import.meta.env.VITE_API_BASE;
      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const assistantText = (data?.response ?? "").toString();
      const aiMsg = { id: crypto.randomUUID(), role: "assistant", content: assistantText, ts: Date.now() };
      setMessages((m) => [...m, aiMsg]);
    } catch (e) {
      console.error(e);
      setError(e?.message || "通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="h-screen w-full bg-[#E3E5E7] flex flex-col">
      {/* ヘッダー：LINE風 */}
      <header className="h-14 flex items-center gap-3 px-4 bg-[#1EA362] text-white shadow">
        <div className="w-7 h-7 rounded-full bg-white/20" />
        <div className="flex flex-col">
          <span className="font-semibold leading-tight">Chat</span>
          <span className="text-xs opacity-90 leading-tight">online</span>
        </div>
      </header>

      {/* メッセージリスト */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-[720px] flex flex-col gap-2">
          {itemsWithDateBreaks.map((item) => {
            if (item._type === "date") {
              return (
                <div key={item.key} className="flex justify-center my-3">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-black/10 text-black/60">
                    {new Date().toLocaleDateString() === item.key.replace("date-", "") ? "Today" : item.key.replace("date-", "")}
                  </span>
                </div>
              );
            }

            const isUser = item.role === "user";
            return (
              <div key={item.id} className={`flex items-end ${isUser ? "justify-end" : "justify-start"}`}>
                {/* Avatar（左側：相手、右側：自分）*/}
                {!isUser && (
                  <div className="mr-2 w-7 h-7 rounded-full bg-[#1EA362] flex items-center justify-center text-white text-xs shrink-0">
                    AI
                  </div>
                )}

                {/* 吹き出し */}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm relative ${
                    isUser ? "bg-[#C5ECBD] rounded-br-sm" : "bg-white rounded-bl-sm"
                  }`}
                >
                  <pre className="whitespace-pre-wrap break-words font-sans">{item.content}</pre>
                  <div className={`text-[10px] opacity-60 mt-1 ${isUser ? "text-right" : "text-left"}`}>
                    {new Date(item.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {/* 吹き出しの小さな角（LINE風の雰囲気）*/}
                  <span
                    className={`absolute -bottom-1 ${
                      isUser ? "right-2 rotate-45 bg-[#C5ECBD]" : "left-2 -rotate-45 bg-white"
                    } w-2 h-2 block`}
                    style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}
                  />
                </div>

                {isUser && (
                  <div className="ml-2 w-7 h-7 rounded-full bg-[#8BC34A] flex items-center justify-center text-white text-xs shrink-0">
                    Me
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start items-end">
              <div className="mr-2 w-7 h-7 rounded-full bg-[#1EA362] flex items-center justify-center text-white text-xs">AI</div>
              <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm text-[15px]">
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center mt-2">
              <div className="text-[12px] px-3 py-2 rounded bg-red-100 text-red-700">{error}</div>
            </div>
          )}
        </div>
      </main>

      {/* 入力エリア */}
      <footer className="border-t border-black/10 bg-white px-3 py-2">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="メッセージを入力"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1EA362]/40 max-h-36"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-2xl px-4 h-10 bg-[#1EA362] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              送信
            </button>
          </div>
          <div className="text-[10px] text-black/40 mt-1">Enterで送信 / Shift+Enterで改行</div>
        </div>
      </footer>
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
