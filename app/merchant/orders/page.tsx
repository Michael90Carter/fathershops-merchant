// app/merchant/orders/page.tsx
// Order flow: Pending → Submitted (merchant) → Processing → Shipped → Delivered
// Pricing: Deduct $100 → Customer pays $120 (+20%) → Platform 3% fee → Merchant gets $116.40
"use client";
import { useState } from "react";
import Link from "next/link";
import { useMerchant } from "../layout";
import { useOrders, useMerchantStore } from "@/lib/hooks";
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C={blue:"#1a56db",green:"#16a34a",amber:"#d97706",red:"#dc2626",violet:"#7c3aed",sky:"#0891b2"};

const STATUS_PATH = [
  {key:"pending",    label:"Order Received",  icon:"📥", desc:"New order in your store"},
  {key:"submitted",  label:"Submitted",        icon:"✅", desc:"You submitted for processing"},
  {key:"processing", label:"Processing",       icon:"⚙️", desc:"Order is being prepared"},
  {key:"shipped",    label:"Shipped",          icon:"🚚", desc:"On its way to customer"},
  {key:"delivered",  label:"Delivered",        icon:"🎉", desc:"Customer received order"},
];

function StatusPath({status}:{status:string}){
  const idx=STATUS_PATH.findIndex(s=>s.key===status);
  if(status==="cancelled") return(
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"rgba(220,38,38,.08)",borderRadius:8,border:"1px solid rgba(220,38,38,.2)"}}>
      <span style={{fontSize:16}}>❌</span>
      <span style={{fontSize:12,color:C.red,fontWeight:600}}>Order Cancelled</span>
    </div>
  );
  return(
    <div style={{overflowX:"auto",paddingBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:0,minWidth:420}}>
        {STATUS_PATH.map((s,i)=>{
          const done=i<idx;const active=i===idx;const future=i>idx;
          return(
            <div key={s.key} style={{display:"flex",alignItems:"center",flex:i<STATUS_PATH.length-1?1:"none"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,
                  background:done?C.green:active?C.blue:"#f3f4f6",
                  border:`2px solid ${done?C.green:active?C.blue:"#e5e7eb"}`,
                  transition:"all .3s"}}>
                  {done?"✓":active?<span style={{fontSize:12}}>{s.icon}</span>:<span style={{fontSize:11,opacity:.4}}>{s.icon}</span>}
                </div>
                <div style={{fontSize:9,fontWeight:active?700:400,color:done?C.green:active?C.blue:"#9ca3af",whiteSpace:"nowrap",textAlign:"center",maxWidth:64}}>{s.label}</div>
              </div>
              {i<STATUS_PATH.length-1&&<div style={{flex:1,height:2,margin:"0 2px 16px",background:done?C.green:"#e5e7eb",transition:"background .3s"}}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SBadge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string}>={
    pending:{c:C.violet,bg:"rgba(124,58,237,.1)"},submitted:{c:C.blue,bg:"rgba(26,86,219,.1)"},
    processing:{c:C.amber,bg:"rgba(217,119,6,.1)"},shipped:{c:C.sky,bg:"rgba(8,145,178,.1)"},
    delivered:{c:C.green,bg:"rgba(22,163,74,.1)"},cancelled:{c:C.red,bg:"rgba(220,38,38,.1)"},
  };
  const st=m[s]??{c:"#6b7280",bg:"rgba(107,114,128,.1)"};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,color:st.c,background:st.bg,textTransform:"uppercase"}}>{s}</span>;
}

export default function OrdersPage(){
  const ctx = useMerchant();
  const [filter,setFilter] = useState("All");
  const {orders,loading}   = useOrders(ctx.uid,filter==="All"?undefined:filter);
  const {store}            = useMerchantStore(ctx.uid);
  const [expanded,setExpanded] = useState<string|null>(null);
  const [submitting,setSubmitting] = useState<string|null>(null);
  const isBlocked = store?.status==="blocked";

  // Summary stats
  const totalRevenue = orders.filter(o=>o.status!=="cancelled").reduce((a,o)=>a+o.total,0);
  const totalProfit  = orders.filter(o=>o.status==="delivered").reduce((a,o)=>a+(o.merchantEarnings??0),0);
  const pendingCount = orders.filter(o=>o.status==="pending").length;

  async function handleSubmitOrder(order:any){
    if(isBlocked){toast.error("Store is blocked. Contact support.");return;}
    const baseCost = order.totalBaseCost??order.total??0;
    // Customer pays base + 20%
    const customerPayment = +(baseCost*1.20).toFixed(2);
    // Platform takes 3% of customer payment
    const commission      = +(customerPayment*0.03).toFixed(2);
    // Merchant receives customer payment minus commission
    const merchantReceives= +(customerPayment-commission).toFixed(2);
    const netProfit       = +(merchantReceives-baseCost).toFixed(2);

    // Check wallet
    const wSnap=await getDocs(query(collection(db,"wallets"),where("merchantId","==",ctx.uid),limit(1)));
    if(wSnap.empty){toast.error("Wallet not found.");return;}
    const wallet=wSnap.docs[0].data();
    const currentUSD=wallet.usdEquivalent??0;
    if(currentUSD<baseCost){
      toast.error(`Insufficient funds. Need $${baseCost.toFixed(2)}, have $${currentUSD.toFixed(2)}.`);return;
    }

    if(!confirm(
      `Submit order for ${order.customer?.name}?\n\n` +
      `Deducted now:        -$${baseCost.toFixed(2)}\n` +
      `Customer pays (+20%): $${customerPayment.toFixed(2)}\n` +
      `Platform fee (3%):   -$${commission.toFixed(2)}\n` +
      `You receive:         +$${merchantReceives.toFixed(2)}\n` +
      `Your net profit:     +$${netProfit.toFixed(2)}`
    ))return;

    setSubmitting(order.id);
    try{
      const dueDate=new Date();
      dueDate.setDate(dueDate.getDate()+(store?.settings?.deliveryDays??3));

      // 1 — Update order
      await updateDoc(doc(db,"orders",order.id),{
        status:"submitted",fundsDeducted:true,
        merchantSubmittedAt:serverTimestamp(),updatedAt:serverTimestamp(),
        reimbursementDue:dueDate,
        customerPayment,platformCommission:commission,
        merchantEarnings:netProfit,totalReimbursement:merchantReceives,
        totalBaseCost:baseCost,
      });

      // 2 — Deduct wallet
      await updateDoc(wSnap.docs[0].ref,{
        "balances.USDT_TRC20":Math.max(0,(wallet.balances?.USDT_TRC20??0)-baseCost),
        usdEquivalent:Math.max(0,currentUSD-baseCost),
        updatedAt:serverTimestamp(),
      });

      // 3 — Log transaction
      await addDoc(collection(db,"transactions"),{
        merchantId:ctx.uid,storeId:ctx.storeId,merchantName:ctx.storeName,
        type:"order_deduction",coin:"USDT",network:"TRC20",
        amount:baseCost,usdValue:baseCost,
        txHash:`submit_${order.id}_${Date.now()}`,status:"confirmed",
        description:`Order submitted. Customer pays $${customerPayment.toFixed(2)}. You receive $${merchantReceives.toFixed(2)} after delivery.`,
        createdAt:serverTimestamp(),
      });

      // 4 — Schedule reimbursement
      await addDoc(collection(db,"pending_reimbursements"),{
        orderId:order.id,merchantId:ctx.uid,storeId:ctx.storeId,merchantName:ctx.storeName,
        totalBaseCost:baseCost,customerPayment,platformCommission:commission,
        merchantProfit:netProfit,totalReimbursement:merchantReceives,
        dueAt:dueDate,processed:false,createdAt:serverTimestamp(),
      });

      toast.success(`Order submitted! -$${baseCost.toFixed(2)} deducted. You'll receive +$${merchantReceives.toFixed(2)} after delivery.`);
    }catch{toast.error("Failed to submit order.");}
    setSubmitting(null);
  }

  const card:React.CSSProperties={background:"#fff",border:"1px solid #e5e9f5",borderRadius:14};

  return(<div>
    <div className="fu" style={{marginBottom:18}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:12}}>My Orders</h1>

      {isBlocked&&<div style={{background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.red,fontWeight:600}}>
        🚫 Store blocked — view only. <Link href="/merchant/chat" style={{color:C.red,fontWeight:700}}>Contact support →</Link>
      </div>}

      {pendingCount>0&&!isBlocked&&<div style={{background:"rgba(26,86,219,.06)",border:"1px solid rgba(26,86,219,.2)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <span style={{fontWeight:700,fontSize:13,color:C.blue}}>⚡ {pendingCount} order{pendingCount>1?"s":""} waiting</span>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Submit to process · Funds deducted now · Profit credited after delivery</div>
        </div>
      </div>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Total Orders",v:orders.length,c:C.blue},{l:"Total Revenue",v:`$${totalRevenue.toFixed(0)}`,c:C.green},{l:"Net Profit",v:`$${totalProfit.toFixed(0)}`,c:C.amber}].map(s=>(
          <div key={s.l} style={{...card,padding:13,textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:18,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:4}}>
        {["All","pending","submitted","processing","shipped","delivered","cancelled"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 13px",borderRadius:99,flexShrink:0,border:`1.5px solid ${filter===s?C.blue:"#e5e9f5"}`,background:filter===s?`${C.blue}10`:"#fff",color:filter===s?C.blue:"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap"}}>{s}</button>
        ))}
      </div>
    </div>

    {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af"}}>Loading orders…</div>:
    orders.length===0?<div style={{...card,padding:48,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>📦</div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>{filter==="All"?"No orders yet":`No ${filter} orders`}</div>
      <div style={{fontSize:13,color:"#6b7280"}}>Orders placed on your store will appear here for you to process.</div>
    </div>:(
      <div style={{display:"grid",gap:10}}>
        {orders.map((o:any,i:number)=>{
          const isOpen=expanded===o.id;
          const canSubmit=o.status==="pending"&&!isBlocked;
          const baseCost=o.totalBaseCost??o.total??0;
          const custPay=o.customerPayment??+(baseCost*1.20).toFixed(2);
          const comm=o.platformCommission??+(custPay*0.03).toFixed(2);
          const recv=o.totalReimbursement??+(custPay-comm).toFixed(2);
          const netP=o.merchantEarnings??+(recv-baseCost).toFixed(2);

          return(
            <div key={o.id} className={`fu d${Math.min(i%5+1,5)}`}
              style={{...card,overflow:"hidden",border:canSubmit?"2px solid rgba(26,86,219,.3)":"1px solid #e5e9f5"}}>

              {/* Card header */}
              <div style={{padding:16,cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:o.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:14}}>{o.customer?.name}</span>
                      <SBadge s={o.status}/>
                    </div>
                    <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>
                      {o.placedAt?.toDate?.().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {o.items?.length??0} item{o.items?.length!==1?"s":""}
                    </div>
                    {o.status==="submitted"&&o.reimbursementDue&&(
                      <div style={{fontSize:11,color:C.green,fontWeight:600}}>
                        💰 Payment due: {new Date(o.reimbursementDue?.seconds?o.reimbursementDue.seconds*1000:o.reimbursementDue).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>${o.total?.toFixed(2)}</div>
                    {o.fundsDeducted&&<div style={{fontSize:11,color:C.green}}>✓ Paid</div>}
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{isOpen?"▲ less":"▼ more"}</div>
                  </div>
                </div>

                {/* Status path — always visible */}
                <StatusPath status={o.status}/>

                {/* Submit button for pending orders */}
                {canSubmit&&(
                  <div style={{marginTop:12}} onClick={e=>e.stopPropagation()}>
                    <div style={{background:"#f0f7ff",border:"1px solid rgba(26,86,219,.15)",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                      <div style={{fontWeight:600,fontSize:12,color:"#374151",marginBottom:6}}>Order Summary</div>
                      {[
                        {l:"Deducted from wallet now",   v:`-$${baseCost.toFixed(2)}`,   c:C.red},
                        {l:"Customer pays (+20%)",        v:`$${custPay.toFixed(2)}`,     c:"#374151"},
                        {l:"Platform fee (3%)",           v:`-$${comm.toFixed(2)}`,       c:C.amber},
                        {l:"You receive after delivery",  v:`+$${recv.toFixed(2)}`,       c:C.green},
                      ].map(r=>(
                        <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(0,0,0,.04)"}}>
                          <span style={{fontSize:11,color:"#6b7280"}}>{r.l}</span>
                          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:11,color:r.c}}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>handleSubmitOrder(o)} disabled={submitting===o.id}
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"none",
                        background:submitting===o.id?"#93c5fd":`linear-gradient(135deg,${C.blue},${C.violet})`,
                        color:"#fff",fontWeight:700,fontSize:14,cursor:submitting===o.id?"not-allowed":"pointer",opacity:submitting===o.id?.7:1}}>
                      {submitting===o.id?"Submitting…":`⚡ Submit for Shipping · Deduct $${baseCost.toFixed(2)}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded detail */}
              {isOpen&&(
                <div style={{borderTop:"1px solid #f3f4f6",padding:16}}>
                  {/* Customer */}
                  <div style={{background:"#f9fafb",borderRadius:11,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Customer Details</div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{o.customer?.name}</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>{o.customer?.email}</div>
                    {o.customer?.phone&&<div style={{fontSize:12,color:"#6b7280"}}>{o.customer?.phone}</div>}
                    {o.customer?.address&&<div style={{fontSize:12,color:"#6b7280",marginTop:4}}>
                      📍 {o.customer.address.line1}, {o.customer.address.city}, {o.customer.address.country}
                    </div>}
                  </div>

                  {/* Items */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Order Items</div>
                    {o.items?.map((it:any,idx:number)=>(
                      <div key={idx} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{it.productName}</div>
                          <div style={{fontSize:11,color:"#9ca3af"}}>Qty: {it.quantity} × ${it.unitPrice?.toFixed(2)}</div>
                        </div>
                        <div style={{fontWeight:700,fontSize:13}}>${(it.unitPrice*it.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Financial breakdown */}
                  <div style={{background:"#f0fdf4",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(22,163,74,.2)"}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>Financial Breakdown</div>
                    {[
                      {l:"Order value",              v:`$${o.total?.toFixed(2)}`,   c:"#374151", bold:false},
                      {l:"Deducted from your wallet",v:`-$${baseCost.toFixed(2)}`, c:C.red,     bold:false},
                      {l:"Customer pays (+20%)",     v:`$${custPay.toFixed(2)}`,   c:"#374151", bold:false},
                      {l:"Platform fee (3%)",        v:`-$${comm.toFixed(2)}`,     c:C.amber,   bold:false},
                      {l:"You receive after delivery",v:`+$${recv.toFixed(2)}`,   c:C.blue,    bold:true},
                      {l:"Your net profit",          v:`+$${netP.toFixed(2)}`,    c:C.green,   bold:true},
                    ].map(r=>(
                      <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:r.bold?"none":"1px solid rgba(0,0,0,.04)"}}>
                        <span style={{fontSize:12,color:"#6b7280",fontWeight:r.bold?600:400}}>{r.l}</span>
                        <span style={{fontFamily:"monospace",fontWeight:r.bold?800:600,fontSize:r.bold?13:12,color:r.c}}>{r.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tracking */}
                  {o.trackingNumber&&<div style={{marginTop:10,background:"#eff6ff",borderRadius:9,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,border:"1px solid rgba(26,86,219,.15)"}}>
                    <span style={{fontSize:18}}>🚚</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:C.blue}}>Tracking Number</div>
                      <div style={{fontFamily:"monospace",fontSize:12,color:"#374151"}}>{o.trackingNumber}</div>
                    </div>
                  </div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>);
}
