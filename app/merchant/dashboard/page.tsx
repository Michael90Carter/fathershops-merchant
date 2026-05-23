// app/merchant/dashboard/page.tsx — no admin mentions, clean merchant view
"use client";
import Link from "next/link";
import { useMerchant } from "../layout";
import { useOrders, useWallet, useStoreProducts, useMerchantStore, useMerchantKYC } from "@/lib/hooks";

const C={blue:"#1a56db",green:"#16a34a",amber:"#d97706",red:"#dc2626",violet:"#7c3aed"};

function SBadge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string,label:string}>={
    pending:   {c:C.violet, bg:"rgba(124,58,237,.1)",  label:"Pending"},
    submitted: {c:C.blue,   bg:"rgba(26,86,219,.1)",   label:"Submitted"},
    processing:{c:C.amber,  bg:"rgba(217,119,6,.1)",   label:"Processing"},
    shipped:   {c:"#0891b2",bg:"rgba(8,145,178,.1)",   label:"Shipped"},
    delivered: {c:C.green,  bg:"rgba(22,163,74,.1)",   label:"Delivered"},
    cancelled: {c:C.red,    bg:"rgba(220,38,38,.1)",   label:"Cancelled"},
  };
  const st=m[s]??{c:"#6b7280",bg:"rgba(107,114,128,.1)",label:s};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,color:st.c,background:st.bg}}>{st.label}</span>;
}

export default function DashboardPage(){
  const ctx   = useMerchant();
  const {orders}  = useOrders(ctx.uid);
  const {wallet}  = useWallet(ctx.uid);
  const {items}   = useStoreProducts(ctx.storeId);
  const {store}   = useMerchantStore(ctx.uid);
  const {kyc}     = useMerchantKYC(ctx.uid);

  const isBlocked = store?.status==="blocked";

  // Stats
  const revenue     = orders.filter(o=>o.status!=="cancelled").reduce((a,o)=>a+o.total,0);
  const todaySales  = orders.filter(o=>{const d=o.placedAt?.toDate?.();return d&&d.toDateString()===new Date().toDateString()&&o.status!=="cancelled";}).reduce((a,o)=>a+o.total,0);
  const todayOrders = orders.filter(o=>{const d=o.placedAt?.toDate?.();return d&&d.toDateString()===new Date().toDateString();}).length;
  const deliveredOrders = orders.filter(o=>o.status==="delivered");
  const profit      = deliveredOrders.reduce((a,o)=>a+(o.merchantEarnings??0),0);
  const todayProfit = orders.filter(o=>{const d=o.placedAt?.toDate?.();return d&&d.toDateString()===new Date().toDateString()&&o.status==="delivered";}).reduce((a,o)=>a+(o.merchantEarnings??0),0);
  const totalQty    = orders.filter(o=>o.status!=="cancelled").reduce((a,o)=>a+(o.items?.reduce((b:number,i:any)=>b+(i.quantity??1),0)??0),0);
  const pendingOrders = orders.filter(o=>o.status==="pending").length;
  const onTimeRate  = store?.totalOrders>0?Math.round(((store.onTimeOrders??0)/(store.totalOrders??1))*100):100;
  const creditScore = Math.min(100,Math.max(0,onTimeRate>90?90:onTimeRate>70?75:50));
  const storeRating = store?.rating??0;
  const salesTarget = store?.settings?.salesTarget??10000;
  const salesProgress=Math.min((revenue/salesTarget)*100,100);
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";

  return(<div>
    {/* Header */}
    <div className="fu" style={{marginBottom:18}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>{greet}, {ctx.name.split(" ")[0]}! 👋</h1>
      <p style={{color:"#6b7280",fontSize:13}}>{ctx.storeName} · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
    </div>

    {/* Blocked banner */}
    {isBlocked&&<div style={{background:"rgba(220,38,38,.06)",border:"2px solid rgba(220,38,38,.3)",borderRadius:14,padding:"16px 18px",marginBottom:18}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <span style={{fontSize:28,flexShrink:0}}>🚫</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16,color:C.red,marginBottom:4}}>Store Blocked — Read Only</div>
          <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6,marginBottom:12}}>{store?.blockedReason||"Your store has been temporarily blocked. Please contact support."}</div>
          <Link href="/merchant/chat" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,background:C.red,color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>
            💬 Contact Support
          </Link>
        </div>
      </div>
    </div>}

    {/* KYC alert */}
    {!isBlocked&&kyc?.status==="pending"&&<div style={{background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.25)",borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:600}}>
      ⏳ Your identity is being verified. Your store will be activated shortly.
    </div>}

    {/* Pending orders alert */}
    {!isBlocked&&pendingOrders>0&&<div style={{background:"rgba(26,86,219,.06)",border:"1px solid rgba(26,86,219,.2)",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div style={{fontWeight:600,fontSize:13,color:C.blue}}>⚡ {pendingOrders} new order{pendingOrders>1?"s":""} received — submit to process</div>
      <Link href="/merchant/orders" style={{padding:"6px 14px",borderRadius:8,background:C.blue,color:"#fff",fontWeight:700,fontSize:12,textDecoration:"none"}}>View Orders →</Link>
    </div>}

    {/* ── STATS GRID (9 stats like screenshot) ── */}
    <div className="fu d1" style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:16,padding:18,marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Store Overview</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Credit Score",        v:creditScore,                                            sub:`${onTimeRate}% on-time`,              c:creditScore>=80?C.green:creditScore>=60?C.amber:C.red},
          {l:"Today's Orders",      v:todayOrders,                                            sub:`${orders.length} total`,              c:C.blue},
          {l:"Total Qty Ordered",   v:totalQty,                                               sub:"cumulative units",                    c:C.violet},
          {l:"Today's Sales",       v:`$${todaySales.toFixed(2)}`,                            sub:"revenue today",                       c:C.green},
          {l:"Total Sales",         v:`$${revenue.toFixed(2)}`,                               sub:`${orders.filter(o=>o.status!=="cancelled").length} orders`, c:C.blue},
          {l:"Today's Profit",      v:`$${todayProfit.toFixed(2)}`,                           sub:"from deliveries",                     c:C.amber},
          {l:"Total Profit",        v:`$${profit.toFixed(2)}`,                                sub:`${deliveredOrders.length} delivered`, c:C.green},
          {l:"Store Rating",        v:`${"★".repeat(Math.round(storeRating))||"☆☆☆☆☆"}`,      sub:`${storeRating.toFixed(1)} / 5.0`,    c:C.amber},
          {l:"Wallet Balance",      v:`$${(wallet?.usdEquivalent??0).toFixed(2)}`,            sub:"available funds",                     c:C.green},
        ].map((s,i)=>(
          <div key={i} style={{background:"#f9fafb",borderRadius:11,padding:"12px 14px",border:"1px solid #e5e9f5",opacity:isBlocked?.7:1}}>
            <div style={{fontWeight:800,fontSize:i===7?12:18,color:s.c,marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:11,color:"#374151",fontWeight:600,marginBottom:1}}>{s.l}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Sales progress */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:12,fontWeight:600}}>Sales Progress</span>
          <span style={{fontFamily:"monospace",fontSize:12,color:C.blue,fontWeight:700}}>${revenue.toFixed(0)} / ${salesTarget.toLocaleString()}</span>
        </div>
        <div style={{height:8,background:"#f3f4f6",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${salesProgress}%`,background:`linear-gradient(90deg,${C.blue},${C.violet})`,borderRadius:99,transition:"width .5s"}}/>
        </div>
        <div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>{salesProgress.toFixed(0)}% of monthly sales target reached</div>
      </div>
    </div>

    {/* Wallet hero */}
    <div className="fu d2" style={{background:`linear-gradient(135deg,${C.blue},${C.violet})`,borderRadius:18,padding:20,marginBottom:14,color:"#fff",opacity:isBlocked?.7:1}}>
      <div style={{fontSize:11,fontWeight:600,opacity:.8,marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Wallet Balance</div>
      <div style={{fontWeight:800,fontSize:32,letterSpacing:"-1.5px",marginBottom:12}}>${(wallet?.usdEquivalent??0).toLocaleString("en-US",{minimumFractionDigits:2})}</div>
      {!isBlocked&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{l:"↓ Deposit",href:"/merchant/wallet?tab=deposit"},{l:"↑ Withdraw",href:"/merchant/wallet?tab=withdraw"}].map(b=>(
          <Link key={b.l} href={b.href} style={{padding:"9px",borderRadius:11,textAlign:"center",border:"2px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none",display:"block"}}>{b.l}</Link>
        ))}
      </div>}
    </div>

    {/* Recent orders */}
    <div className="fu d3" style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:14,padding:18,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14}}>Recent Orders</div>
        {!isBlocked&&<Link href="/merchant/orders" style={{fontSize:12,color:C.blue,textDecoration:"none",fontWeight:600}}>View all →</Link>}
      </div>
      {orders.length===0?<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:28,marginBottom:6}}>📭</div>
        <div style={{fontWeight:700,fontSize:13,color:"#6b7280",marginBottom:4}}>No orders yet</div>
        <div style={{fontSize:12,color:"#9ca3af"}}>Orders placed on your store will appear here</div>
      </div>:orders.slice(0,5).map(o=>(
        <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
          <div style={{flex:1,minWidth:0,marginRight:10}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{o.customer.name}</div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.items?.map((i:any)=>i.productName).join(", ")}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:3}}>${o.total.toFixed(2)}</div>
            <SBadge s={o.status}/>
          </div>
        </div>
      ))}
    </div>

    {/* Quick actions */}
    {!isBlocked&&<div className="fu d4" style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:14,padding:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Quick Actions</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
        {[
          {l:"Browse Products", href:"/merchant/products?tab=catalog", icon:"📦"},
          {l:"View Orders",     href:"/merchant/orders",               icon:"🛒"},
          {l:"Deposit Funds",   href:"/merchant/wallet?tab=deposit",   icon:"💰"},
          {l:"Other Stores",    href:"/merchant/stores",               icon:"🏪"},
        ].map(a=>(
          <Link key={a.l} href={a.href} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:11,border:"1.5px solid #e5e9f5",textDecoration:"none",color:"#374151",background:"#fafbff"}}>
            <span style={{fontSize:20}}>{a.icon}</span>
            <span style={{fontSize:13,fontWeight:600}}>{a.l}</span>
          </Link>
        ))}
      </div>
    </div>}
  </div>);
}
