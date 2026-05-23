// app/merchant/layout.tsx — full rebuild with topbar notifications, theme toggle, language, blocked lockdown
"use client";
import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useMerchantChatRoom, useMerchantStore, useNotifications } from "@/lib/hooks";

// ── Contexts ──────────────────────────────────────────────────
interface Ctx { uid:string; name:string; email:string; storeId:string; storeName:string; }
export const MerchantCtx = createContext<Ctx|null>(null);
export const useMerchant = () => useContext(MerchantCtx)!;

// ── Language map ──────────────────────────────────────────────
const LANGS = [
  {code:"en", label:"English",    flag:"🇬🇧"},
  {code:"es", label:"Español",    flag:"🇪🇸"},
  {code:"fr", label:"Français",   flag:"🇫🇷"},
  {code:"de", label:"Deutsch",    flag:"🇩🇪"},
  {code:"ar", label:"العربية",    flag:"🇸🇦"},
  {code:"zh", label:"中文",        flag:"🇨🇳"},
];

// ── SVG Icons ─────────────────────────────────────────────────
const Icon = ({ d, size=18 }:{d:string;size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const IC = {
  dashboard:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  products:     "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  orders:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2",
  wallet:       "M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-5 M18 12a2 2 0 000 4h3v-4z",
  transactions: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  chat:         "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  settings:     "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  stores:       "M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M8 22V12h8v10",
  sun:          "M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 8a4 4 0 100 8 4 4 0 000-8z",
  moon:         "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  bell:         "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  logout:       "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  menu:         "M3 6h18M3 12h18M3 18h18",
  x:            "M18 6L6 18M6 6l12 12",
  lock:         "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

const NAV = [
  { href:"/merchant/dashboard",    label:"Dashboard",    icon:"dashboard",    emoji:"🏠" },
  { href:"/merchant/products",     label:"Products",     icon:"products",     emoji:"📦" },
  { href:"/merchant/orders",       label:"Orders",       icon:"orders",       emoji:"🛒" },
  { href:"/merchant/wallet",       label:"Wallet",       icon:"wallet",       emoji:"💰" },
  { href:"/merchant/transactions", label:"Transactions", icon:"transactions", emoji:"📊" },
  { href:"/merchant/stores",       label:"Merchants",    icon:"stores",       emoji:"🏪" },
  { href:"/merchant/chat",         label:"Support",      icon:"chat",         emoji:"💬", chat:true },
  { href:"/merchant/settings",     label:"Settings",     icon:"settings",     emoji:"⚙️"  },
];

// Always-allowed routes even when blocked
const ALLOWED_WHEN_BLOCKED = ["/merchant/dashboard", "/merchant/chat", "/merchant/settings"];

function ChatBadgeCount({ merchantId }:{ merchantId:string }) {
  const { room } = useMerchantChatRoom(merchantId);
  const n = room?.unreadMerchant ?? 0;
  if (!n) return null;
  return <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</span>;
}

export default function MerchantLayout({ children }: { children:React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ctx, setCtx]           = useState<Ctx|null>(null);
  const [checking, setChecking] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [dark, setDark]         = useState(false);
  const [lang, setLang]         = useState("en");
  const [showLang, setShowLang] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const { store }  = useMerchantStore(ctx?.uid ?? null);
  const { notifs, unread, markRead } = useNotifications(ctx?.uid ?? null);
  const isBlocked  = store?.status === "blocked";

  // Theme colours
  const T = dark ? {
    bg:"#0f1117", surface:"#1a1d27", border:"rgba(255,255,255,.08)",
    text:"#e2e8f8", muted:"#7b88aa", card:"#1e2235",
  } : {
    bg:"#f4f6fb", surface:"#fff", border:"#e5e9f5",
    text:"#111827", muted:"#6b7280", card:"#fff",
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { router.replace("/login"); return; }
      const snap = await getDoc(doc(db,"users",u.uid));
      if (!snap.exists() || snap.data().role !== "merchant") {
        await signOut(auth); router.replace("/login"); return;
      }
      const sq = await getDocs(query(collection(db,"stores"),where("merchantId","==",u.uid),limit(1)));
      const s = sq.empty ? null : {id:sq.docs[0].id,...sq.docs[0].data()} as any;
      setCtx({ uid:u.uid, name:snap.data().displayName, email:u.email??"",
        storeId:s?.id??"", storeName:s?.storeName??"My Store" });
      setChecking(false);
    });
  },[router]);

  // Redirect blocked merchant away from restricted pages
  useEffect(() => {
    if (!isBlocked || !ctx) return;
    const allowed = ALLOWED_WHEN_BLOCKED.some(p => pathname.startsWith(p));
    if (!allowed) router.replace("/merchant/dashboard");
  },[isBlocked, pathname, ctx]);

  if (checking) return (
    <div style={{minHeight:"100vh",background:"#f4f6fb",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #bfdbfe",borderTopColor:"#1a56db",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  const active = (href:string) => pathname===href||pathname.startsWith(href+"/");
  const currentLang = LANGS.find(l=>l.code===lang) ?? LANGS[0];

  // Whether a nav item is clickable
  const isClickable = (href:string) => {
    if (!isBlocked) return true;
    return ALLOWED_WHEN_BLOCKED.some(a => href.startsWith(a));
  };

  const SideContent = ({ mobile=false }) => (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.surface,borderRight:`1px solid ${T.border}`}}>
      {/* Brand */}
      <div style={{padding:"16px 14px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,#1a56db,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.3px",color:T.text}}>FatherShops</div>
            <div style={{fontSize:9,color:"#1a56db",fontFamily:"monospace",letterSpacing:".5px"}}>MERCHANT</div>
          </div>
          {mobile&&<button onClick={()=>setSideOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:T.muted,cursor:"pointer",lineHeight:1}}>
            <Icon d={IC.x} size={20}/>
          </button>}
        </div>
      </div>

      {/* Store badge */}
      <div style={{padding:"8px 10px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{background:isBlocked?"rgba(220,38,38,.08)":dark?"rgba(26,86,219,.12)":"#eff6ff",borderRadius:9,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,border:isBlocked?"1px solid rgba(220,38,38,.2)":"none"}}>
          <div style={{width:26,height:26,borderRadius:6,background:isBlocked?"#dc2626":"#1a56db",color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {isBlocked?"🚫":ctx?.storeName.slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:isBlocked?"#dc2626":"#1a56db",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ctx?.storeName}</div>
            <div style={{fontSize:9,color:T.muted}}>{isBlocked?"BLOCKED — Contact Admin":store?.status?.toUpperCase()??"ACTIVE"}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
        {NAV.map(n => {
          const isAct=active(n.href);
          const canClick=isClickable(n.href);
          return (
            <div key={n.href} style={{position:"relative",marginBottom:1}}>
              {canClick ? (
                <Link href={n.href} onClick={()=>mobile&&setSideOpen(false)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:9,textDecoration:"none",transition:"all .15s",
                    background:isAct?dark?"rgba(26,86,219,.18)":"#eff6ff":"transparent",
                    color:isAct?"#1a56db":T.muted,fontWeight:isAct?600:400,fontSize:13,
                    borderLeft:isAct?"2px solid #1a56db":"2px solid transparent"}}>
                  <span style={{flexShrink:0,opacity:isAct?1:.7}}><Icon d={(IC as any)[n.icon]} size={15}/></span>
                  <span style={{flex:1}}>{n.label}</span>
                  {n.chat&&ctx&&<div style={{position:"relative",display:"inline-block"}}><ChatBadgeCount merchantId={ctx.uid}/></div>}
                </Link>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:9,opacity:.35,cursor:"not-allowed",fontSize:13,color:T.muted}}>
                  <Icon d={IC.lock} size={14}/>
                  <span style={{flex:1}}>{n.label}</span>
                  <span style={{fontSize:9,color:"#dc2626",fontWeight:700}}>LOCKED</span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{padding:"10px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:dark?"#1e2235":"#f9fafb",borderRadius:9}}>
          <div style={{width:30,height:30,borderRadius:8,background:"#1a56db",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {ctx?.name.slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ctx?.name}</div>
            <div style={{fontSize:10,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ctx?.email}</div>
          </div>
          <button onClick={async()=>{await signOut(auth);router.replace("/login");}} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",padding:4}}>
            <Icon d={IC.logout} size={14}/>
          </button>
        </div>
      </div>
    </div>
  );

  const isChat = pathname==="/merchant/chat";

  return (
    <MerchantCtx.Provider value={ctx}>
      <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,transition:"background .2s"}}>
        {/* Desktop sidebar */}
        <aside style={{width:220,flexShrink:0,height:"100vh",position:"sticky",top:0,overflowY:"auto",display:"none"}} id="merch-desk">
          <SideContent/>
        </aside>

        {/* Mobile drawer */}
        {sideOpen&&<>
          <div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:40}}/>
          <aside style={{position:"fixed",left:0,top:0,bottom:0,width:240,zIndex:50,overflowY:"auto"}}>
            <SideContent mobile/>
          </aside>
        </>}

        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

          {/* ── TOP BAR ── */}
          <header style={{height:54,background:T.surface,borderBottom:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",padding:"0 14px",justifyContent:"space-between",
            position:"sticky",top:0,zIndex:30,flexShrink:0,
            boxShadow:dark?"none":"0 1px 4px rgba(0,0,0,.06)"}} id="merch-header">

            {/* Left — hamburger + page title */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setSideOpen(true)} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",padding:4,lineHeight:1,display:"flex",alignItems:"center"}}>
                <Icon d={IC.menu} size={20}/>
              </button>
              <div style={{fontWeight:700,fontSize:15,color:T.text}}>
                {NAV.find(n=>active(n.href))?.label??"Dashboard"}
              </div>
            </div>

            {/* Right — language + theme + notifications + avatar */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>

              {/* Language selector */}
              <div style={{position:"relative"}}>
                <button onClick={()=>{setShowLang(v=>!v);setShowNotifs(false);}} style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:T.muted,fontSize:12,fontWeight:600,maxWidth:130}}>
                  <span style={{fontSize:16}}>{currentLang.flag}</span>
                  <span style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentLang.label}</span>
                  <span style={{fontSize:8,flexShrink:0}}>▼</span>
                </button>
                {showLang&&(
                  <div style={{position:"absolute",right:0,top:38,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:60,overflow:"hidden",minWidth:150}}>
                    {LANGS.map(l=>(
                      <div key={l.code} onClick={()=>{setLang(l.code);setShowLang(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",cursor:"pointer",background:lang===l.code?dark?"rgba(26,86,219,.15)":"#eff6ff":"transparent",color:lang===l.code?"#1a56db":T.text,fontWeight:lang===l.code?700:400,fontSize:13}}>
                        <span style={{fontSize:18}}>{l.flag}</span>
                        <span>{l.label}</span>
                        {lang===l.code&&<span style={{marginLeft:"auto",fontSize:10}}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button onClick={()=>setDark(v=>!v)} style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon d={dark?IC.sun:IC.moon} size={16}/>
              </button>

              {/* ── NOTIFICATION BELL ── */}
              <div style={{position:"relative"}}>
                <button onClick={()=>{setShowNotifs(v=>!v);setShowLang(false);}} style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                  <Icon d={IC.bell} size={16}/>
                  {unread>0&&<span style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread>9?"9+":unread}</span>}
                </button>
                {showNotifs&&(
                  <div style={{position:"absolute",right:0,top:42,width:320,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,boxShadow:"0 8px 40px rgba(0,0,0,.18)",zIndex:60,overflow:"hidden"}}>
                    <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:700,fontSize:14,color:T.text}}>Notifications</span>
                      {unread>0&&<span style={{fontSize:11,color:"#1a56db",fontWeight:600}}>{unread} unread</span>}
                    </div>
                    <div style={{maxHeight:360,overflowY:"auto"}}>
                      {notifs.length===0?<div style={{padding:"28px 16px",textAlign:"center",color:T.muted,fontSize:13}}>No notifications yet 🔔</div>:
                      notifs.map(n=>(
                        <div key={n.id} onClick={()=>markRead(n.id)} style={{padding:"11px 16px",borderBottom:`1px solid ${dark?"rgba(255,255,255,.04)":"#f9fafb"}`,cursor:"pointer",background:n.read?"transparent":dark?"rgba(26,86,219,.08)":"rgba(26,86,219,.04)"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                            <span style={{fontSize:20,flexShrink:0}}>{n.type==="kyc"?"🪪":n.type==="order"?"📦":n.type==="deposit"?"💰":n.type==="block"?"🚫":n.type==="earning"?"💸":"🔔"}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:n.read?500:700,marginBottom:2,color:T.text}}>{n.title}</div>
                              <div style={{fontSize:11,color:T.muted,lineHeight:1.5}}>{n.body}</div>
                              <div style={{fontSize:10,color:T.muted,opacity:.6,marginTop:3}}>{n.createdAt?.toDate?.().toLocaleString()}</div>
                            </div>
                            {!n.read&&<div style={{width:7,height:7,borderRadius:"50%",background:"#1a56db",flexShrink:0,marginTop:4}}/>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div onClick={()=>setShowNotifs(false)} style={{padding:"9px",borderTop:`1px solid ${T.border}`,textAlign:"center",fontSize:12,color:"#1a56db",fontWeight:600,cursor:"pointer"}}>Close</div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#1a56db,#7c3aed)",color:"#fff",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {ctx?.name.slice(0,2).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Page content */}
          {isChat
            ? <div style={{flex:1,overflow:"hidden"}}>{children}</div>
            : <main style={{flex:1,overflowY:"auto",padding:"18px 14px 90px",maxWidth:960,width:"100%",margin:"0 auto"}}>{children}</main>
          }

          {/* Mobile bottom nav */}
          <nav style={{position:"fixed",bottom:0,left:0,right:0,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:20,paddingBottom:"env(safe-area-inset-bottom,0px)"}} id="merch-bottom">
            {NAV.slice(0,5).map(n=>{
              const isAct=active(n.href);
              const canClick=isClickable(n.href);
              if(!canClick) return(
                <div key={n.href} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"7px 4px 5px",opacity:.3,cursor:"not-allowed"}}>
                  <span style={{fontSize:17,lineHeight:1}}>{n.emoji}</span>
                  <span style={{fontSize:8,fontWeight:500,color:T.muted}}>Locked</span>
                </div>
              );
              return(
                <Link key={n.href} href={n.href} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"7px 4px 5px",textDecoration:"none",color:isAct?"#1a56db":T.muted,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:17,lineHeight:1}}>{n.emoji}</span>
                  <span style={{fontSize:8,fontWeight:isAct?700:500}}>{n.label==="Transactions"?"Txns":n.label==="Merchants"?"Stores":n.label}</span>
                  {isAct&&<div style={{width:14,height:2,background:"#1a56db",borderRadius:99}}/>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <style>{`
        @media(min-width:768px){
          #merch-desk{display:block!important}
          #merch-header button:first-child{display:none!important}
          #merch-bottom{display:none!important}
          main{padding-bottom:40px!important}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box}
        html{-webkit-text-size-adjust:100%}
      `}</style>
    </MerchantCtx.Provider>
  );
}
