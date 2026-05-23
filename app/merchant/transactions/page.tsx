// app/merchant/transactions/page.tsx
"use client";
import { useState } from "react";
import { useMerchant } from "../layout";
import { useTransactions } from "@/lib/hooks";

const C={blue:"#2563eb",green:"#16a34a",amber:"#d97706",red:"#dc2626"};
const cColor:Record<string,string>={BTC:"#f7931a",ETH:"#627eea",USDT:"#26a17b"};
const cIcon:Record<string,string>={BTC:"🟡",ETH:"🔷",USDT:"🟢"};

export default function TransactionsPage(){
  const ctx=useMerchant();
  const {txns}=useTransactions(ctx.uid);
  const [filter,setFilter]=useState("All");
  const filtered=filter==="All"?txns:filter==="deposit"||filter==="withdrawal"||filter==="order_deduction"?txns.filter(t=>t.type===filter):txns.filter(t=>t.coin===filter);
  const totalIn=txns.filter(t=>t.type==="deposit"&&t.status==="confirmed").reduce((a:number,t:any)=>a+t.usdValue,0);
  const totalOut=txns.filter(t=>t.type==="withdrawal"&&t.status==="confirmed").reduce((a:number,t:any)=>a+t.usdValue,0);

  const card:React.CSSProperties={background:"#fff",border:"1px solid #e5e9f5",borderRadius:14};
  const typeColor:Record<string,string>={deposit:C.green,withdrawal:C.blue,order_deduction:C.red,earning:C.green};
  const typeIcon:Record<string,string>={deposit:"↓",withdrawal:"↑",order_deduction:"⊖",earning:"+"};

  return(<div>
    <div className="fu" style={{marginBottom:18}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:14}}>Transactions</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{...card,padding:13,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:C.green}}>+${totalIn.toFixed(2)}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>Total Deposited</div></div>
        <div style={{...card,padding:13,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:C.blue}}>-${totalOut.toFixed(2)}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>Total Withdrawn</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
        {["BTC","ETH","USDT"].map(coin=>{const tot=txns.filter((t:any)=>t.coin===coin).reduce((a:number,t:any)=>a+t.usdValue,0);return(
          <div key={coin} style={{...card,padding:11,textAlign:"center"}}>
            <div style={{fontSize:17,marginBottom:3}}>{cIcon[coin]}</div>
            <div style={{fontWeight:700,fontSize:12,color:cColor[coin]}}>{coin}</div>
            <div style={{fontFamily:"monospace",fontWeight:700,fontSize:13,marginTop:1}}>${tot.toFixed(0)}</div>
          </div>
        );})}
      </div>
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
        {["All","deposit","withdrawal","order_deduction","BTC","ETH","USDT"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:99,flexShrink:0,border:`1.5px solid ${filter===f?C.blue:"#e5e9f5"}`,background:filter===f?`${C.blue}10`:"#fff",color:filter===f?C.blue:"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",textTransform:"capitalize"}}>{f.replace("_"," ")}</button>)}
      </div>
    </div>
    {txns.length===0?<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>📊</div><div style={{fontWeight:700,fontSize:14,color:"#6b7280"}}>No transactions yet</div></div>:(
      <div style={{...card,padding:18}}>
        {filtered.map((tx:any,i:number)=>{const isIn=tx.type==="deposit"||tx.type==="earning";return(
          <div key={tx.id} className={`fu d${Math.min(i%5+1,5)}`} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
            <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:isIn?"rgba(22,163,74,.1)":"rgba(37,99,235,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{typeIcon[tx.type]||"→"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:2,textTransform:"capitalize"}}>{tx.type.replace("_"," ")}</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:13}}>{cIcon[tx.coin]}</span><span style={{fontWeight:600,fontSize:12,color:cColor[tx.coin]}}>{tx.coin}</span><span style={{fontSize:11,color:"#9ca3af"}}>· {tx.network}</span></div>
              <div style={{fontFamily:"monospace",fontSize:9,color:"#9ca3af",marginTop:2}}>{tx.createdAt?.toDate?.().toLocaleDateString()} · {tx.txHash?.slice(0,14)}…</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"monospace",fontWeight:800,fontSize:15,color:isIn?C.green:"#111827",marginBottom:3}}>{isIn?"+":"-"}${tx.usdValue.toFixed(2)}</div>
              <div style={{fontFamily:"monospace",fontSize:10,color:"#9ca3af",marginBottom:3}}>{tx.amount} {tx.coin}</div>
              <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99,textTransform:"uppercase",color:tx.status==="confirmed"?C.green:tx.status==="pending"?C.amber:C.red,background:tx.status==="confirmed"?"rgba(22,163,74,.1)":tx.status==="pending"?"rgba(217,119,6,.1)":"rgba(220,38,38,.1)"}}>{tx.status}</span>
            </div>
          </div>
        );})}
      </div>
    )}
  </div>);
}
