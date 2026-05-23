// app/merchant/chat/page.tsx — mobile-fixed chat
"use client";
import { useState, useEffect, useRef } from "react";
import { useMerchant } from "../layout";
import { useMerchantChatRoom, useChatMessages, sendMerchantMessage, useMerchantStore } from "@/lib/hooks";

const C = { blue:"#2563eb", green:"#16a34a", violet:"#7c3aed" };

export default function MerchantChatPage() {
  const ctx  = useMerchant();
  const { room }  = useMerchantChatRoom(ctx.uid);
  const { store } = useMerchantStore(ctx.uid);
  const { msgs }  = useChatMessages(room?.id ?? null);
  const [text, setText]     = useState("");
  const [sending, setSending] = useState(false);
  const [roomId, setRoomId]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (room?.id) setRoomId(room.id); }, [room?.id]);
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  }, [msgs]);

  async function send() {
    if (!text.trim() || sending) return;
    const t = text.trim();
    setText("");
    setSending(true);
    try {
      const newRoomId = await sendMerchantMessage(
        roomId ?? "",
        t,
        { uid:ctx.uid, name:ctx.name, email:ctx.email },
        store,
        room?.unreadAdmin ?? 0
      );
      setRoomId(newRoomId);
    } catch(e) { console.error(e); }
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height:"calc(100dvh - 52px)",   /* dvh = dynamic viewport, respects mobile keyboards */
      overflow:"hidden", background:"#f0f4ff",
      position:"relative",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding:"12px 16px", background:"#fff",
        borderBottom:"1px solid #e5e9f5",
        display:"flex", alignItems:"center", gap:12, flexShrink:0,
        boxShadow:"0 1px 4px rgba(0,0,0,.05)",
      }}>
        <div style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          background:"linear-gradient(135deg,#2563eb,#7c3aed)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
        }}>⚡</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>FatherShops Support</div>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:C.green, animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:11, color:"#6b7280" }}>Online · Replies within minutes</span>
          </div>
        </div>
        <div style={{
          background:"rgba(37,99,235,.08)", border:"1px solid rgba(37,99,235,.15)",
          borderRadius:8, padding:"4px 10px", fontSize:11, color:C.blue, fontWeight:600,
        }}>
          💬 Live Chat
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex:1, overflowY:"auto", padding:"14px 14px 8px",
        display:"flex", flexDirection:"column", gap:10,
        WebkitOverflowScrolling:"touch",
      }}>
        {/* Welcome bubble */}
        <div style={{ textAlign:"center", padding:"6px 0" }}>
          <div style={{
            display:"inline-block",
            background:"rgba(37,99,235,.08)", border:"1px solid rgba(37,99,235,.15)",
            borderRadius:20, padding:"6px 14px", fontSize:12, color:"#6b7280",
          }}>
            👋 Chat with our team — we're here to help with any issues
          </div>
        </div>

        {msgs.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#9ca3af", fontSize:13 }}>
            No messages yet. Send us a message below!
          </div>
        )}

        {msgs.map(msg => {
          const isMe = msg.senderRole === "merchant";
          return (
            <div key={msg.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
              {!isMe && (
                <div style={{
                  width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#2563eb,#7c3aed)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, flexShrink:0, marginRight:8, alignSelf:"flex-end",
                }}>⚡</div>
              )}
              <div style={{ maxWidth:"72%", minWidth:60 }}>
                {!isMe && (
                  <div style={{ fontSize:10, color:"#6b7280", marginBottom:3, paddingLeft:2, fontWeight:600 }}>
                    Support Team
                  </div>
                )}
                <div style={{
                  padding:"10px 14px",
                  borderRadius:18,
                  borderBottomRightRadius: isMe ? 4 : 18,
                  borderBottomLeftRadius:  isMe ? 18 : 4,
                  background: isMe
                    ? "linear-gradient(135deg,#2563eb,#7c3aed)"
                    : "#fff",
                  color: isMe ? "#fff" : "#111827",
                  fontSize:13, lineHeight:1.55,
                  boxShadow: isMe
                    ? "0 2px 8px rgba(37,99,235,.3)"
                    : "0 1px 4px rgba(0,0,0,.08)",
                  wordBreak:"break-word",
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize:10, color:"#9ca3af", marginTop:3,
                  textAlign:isMe?"right":"left",
                  paddingRight:isMe?2:0, paddingLeft:isMe?0:2,
                }}>
                  {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                  {isMe && <span style={{ marginLeft:4, opacity:.7 }}>{msg.read ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* ── Input bar — FIXED at bottom, always visible ── */}
      <div style={{
        flexShrink:0,
        background:"#fff",
        borderTop:"1px solid #e5e9f5",
        padding:"10px 12px",
        paddingBottom:"max(10px, env(safe-area-inset-bottom))",
        display:"flex", gap:8, alignItems:"flex-end",
        boxShadow:"0 -2px 8px rgba(0,0,0,.06)",
        /* Keep above mobile keyboard */
        position:"sticky", bottom:0, zIndex:30,
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex:1,
            background:"#f4f6fb",
            border:"1.5px solid #e5e9f5",
            borderRadius:14,
            padding:"10px 14px",
            color:"#111827",
            fontSize:14,
            outline:"none",
            resize:"none",
            lineHeight:1.5,
            maxHeight:100,
            minHeight:42,
            fontFamily:"inherit",
            overflowY:"auto",
            WebkitAppearance:"none",
          }}
          onFocus={e => {
            e.target.style.borderColor = C.blue;
            /* scroll to bottom when keyboard opens on mobile */
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 300);
          }}
          onBlur={e => { e.target.style.borderColor = "#e5e9f5"; }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            width:44, height:44,
            borderRadius:12, border:"none",
            background: text.trim()
              ? "linear-gradient(135deg,#2563eb,#7c3aed)"
              : "#e5e9f5",
            color: text.trim() ? "#fff" : "#9ca3af",
            fontSize:18,
            cursor: text.trim() ? "pointer" : "default",
            flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .15s",
            WebkitTapHighlightColor:"transparent",
          }}
        >
          {sending ? (
            <span style={{ width:16, height:16, borderRadius:"50%",
              border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff",
              display:"inline-block", animation:"spin 1s linear infinite" }}/>
          ) : "➤"}
        </button>
      </div>
    </div>
  );
}
