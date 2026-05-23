// app/merchant/wallet/page.tsx
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMerchant } from "../layout";
import { useWallet, useDepositAddresses, useWithdrawals, requestWithdrawal } from "@/lib/hooks";
import toast from "react-hot-toast";

const C={blue:"#2563eb",green:"#16a34a",amber:"#d97706",red:"#dc2626"};
const cColor:Record<string,string>={BTC:"#f7931a",ETH:"#627eea",USDT:"#26a17b"};
const cIcon:Record<string,string>={BTC:"🟡",ETH:"🔷",USDT:"🟢"};
const cSym:Record<string,string>={BTC:"₿",ETH:"Ξ",USDT:"₮"};

function CopyBtn({text}:{text:string}){
  const [ok,setOk]=useState(false);
  return <button onClick={()=>{navigator.clipboard?.writeText(text);setOk(true);setTimeout(()=>setOk(false),2000);}} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${ok?"rgba(22,163,74,.3)":"#e5e9f5"}`,background:ok?"rgba(22,163,74,.08)":"#f9fafb",color:ok?C.green:"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0,transition:"all .2s"}}>{ok?"✓ Copied":"Copy"}</button>;
}

function WdBadge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string}>={pending:{c:C.amber,bg:"rgba(217,119,6,.1)"},approved:{c:C.green,bg:"rgba(22,163,74,.1)"},rejected:{c:C.red,bg:"rgba(220,38,38,.1)"},completed:{c:C.blue,bg:"rgba(37,99,235,.1)"}};
  const st=m[s]??{c:"#6b7280",bg:"rgba(107,114,128,.1)"};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",color:st.c,background:st.bg}}>{s}</span>;
}

export default function WalletPage(){
  const ctx=useMerchant();
  const params=useSearchParams();
  const [tab,setTab]=useState(params.get("tab")??"overview");
  const [coin,setCoin]=useState("USDT");
  const [net,setNet]=useState("TRC20");
  const [wdAmt,setWdAmt]=useState("");
  const [wdAddr,setWdAddr]=useState("");
  const [sub,setSub]=useState(false);
  const {wallet}=useWallet(ctx.uid);
  const {addrs}=useDepositAddresses(ctx.uid);
  const {wds}=useWithdrawals(ctx.uid);
  const bal=wallet?.balances??{BTC:0,ETH:0,USDT_TRC20:0,USDT_ERC20:0};
  const coins=[{k:"BTC",l:"Bitcoin",b:bal.BTC,u:bal.BTC*66500},{k:"ETH",l:"Ethereum",b:bal.ETH,u:bal.ETH*3000},{k:"USDT",l:"Tether",b:bal.USDT_TRC20+bal.USDT_ERC20,u:bal.USDT_TRC20+bal.USDT_ERC20}];
  const depAddr=addrs.find(a=>a.coin===coin&&(coin!=="USDT"||a.network===net))?.address??"Contact support to get your address.";
  const selBal=coin==="BTC"?bal.BTC:coin==="ETH"?bal.ETH:net==="TRC20"?bal.USDT_TRC20:bal.USDT_ERC20;

  async function handleWd(e:React.FormEvent){
    e.preventDefault();const amt=parseFloat(wdAmt);
    if(!wdAddr.trim()){toast.error("Enter destination address.");return;}
    if(isNaN(amt)||amt<=0){toast.error("Enter valid amount.");return;}
    if(amt>selBal){toast.error("Insufficient balance.");return;}
    setSub(true);
    try{
      await requestWithdrawal({merchantId:ctx.uid,storeId:ctx.storeId,merchantName:ctx.storeName,coin,network:coin==="USDT"?net:coin==="BTC"?"Bitcoin":"Ethereum",amount:amt,usdValue:coin==="BTC"?amt*66500:coin==="ETH"?amt*3000:amt,destinationAddress:wdAddr});
      toast.success("Withdrawal submitted! Admin reviews within 24h.");setWdAmt("");setWdAddr("");setTab("overview");
    }catch{toast.error("Failed.");}setSub(false);
  }

  const card:React.CSSProperties={background:"#fff",border:"1px solid #e5e9f5",borderRadius:14};
  const inp:React.CSSProperties={width:"100%",padding:"10px 13px",border:"1.5px solid #e5e9f5",borderRadius:10,fontSize:13,outline:"none",marginBottom:12,transition:"border .15s"};
  const lbl:React.CSSProperties={display:"block",fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"};

  return(<div>
    <div className="fu" style={{marginBottom:18}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:14}}>Wallet</h1>
      <div style={{background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:18,padding:20,color:"#fff",marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,opacity:.8,marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Portfolio Value</div>
        <div style={{fontWeight:800,fontSize:32,letterSpacing:"-1.5px",marginBottom:4}}>${(wallet?.usdEquivalent??0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style={{fontSize:12,opacity:.7,marginBottom:14}}>BTC · ETH · USDT</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{l:"↓ Deposit",t:"deposit"},{l:"↑ Withdraw",t:"withdraw"}].map(b=>(
            <button key={b.t} onClick={()=>setTab(b.t)} style={{padding:"9px",borderRadius:11,textAlign:"center",border:"2px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>{b.l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gap:8,marginBottom:14}}>
        {coins.map(c=>(
          <div key={c.k} style={{...card,padding:14,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:11,flexShrink:0,background:`${cColor[c.k]}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{cIcon[c.k]}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{c.k}</div><div style={{fontSize:11,color:"#6b7280"}}>{c.l}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:17,color:cColor[c.k]}}>{cSym[c.k]}{c.b.toFixed(c.k==="BTC"?5:4)}</div><div style={{fontSize:11,color:"#6b7280"}}>≈ ${c.u.toLocaleString("en-US",{maximumFractionDigits:2})}</div></div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
        {["overview","deposit","withdraw","history"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:99,flexShrink:0,border:`1.5px solid ${tab===t?C.blue:"#e5e9f5"}`,background:tab===t?`${C.blue}10`:"#fff",color:tab===t?C.blue:"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
      </div>
    </div>

    {tab==="overview"&&<div style={{...card,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Summary</div>
      {[{l:"Total USD",v:`$${(wallet?.usdEquivalent??0).toFixed(2)}`,c:C.blue},{l:"BTC",v:`${bal.BTC.toFixed(5)} BTC`,c:cColor.BTC},{l:"ETH",v:`${bal.ETH.toFixed(4)} ETH`,c:cColor.ETH},{l:"USDT (TRC20)",v:`${bal.USDT_TRC20.toFixed(2)} USDT`,c:cColor.USDT},{l:"USDT (ERC20)",v:`${bal.USDT_ERC20.toFixed(2)} USDT`,c:cColor.USDT}].map(r=>(
        <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
          <span style={{fontSize:13,color:"#6b7280"}}>{r.l}</span>
          <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span>
        </div>
      ))}
    </div>}

    {tab==="deposit"&&<div style={{...card,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>Request a Deposit</div>
      <p style={{fontSize:12,color:"#6b7280",marginBottom:14,lineHeight:1.6}}>Select your coin, enter the amount you plan to send, then submit. The deposit address is shown below. Once admin confirms receipt, funds are credited to your wallet.</p>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Select Coin</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {["BTC","ETH","USDT"].map(c=><button key={c} onClick={()=>setCoin(c)} style={{padding:"10px 6px",borderRadius:11,cursor:"pointer",border:`2px solid ${coin===c?cColor[c]:"#e5e9f5"}`,background:coin===c?`${cColor[c]}10`:"#fafbff",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:20}}>{cIcon[c]}</span><span style={{fontSize:11,fontWeight:700,color:coin===c?cColor[c]:"#6b7280"}}>{c}</span></button>)}
        </div>
      </div>
      {coin==="USDT"&&<div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Network</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {["TRC20","ERC20"].map(n=><button key={n} onClick={()=>setNet(n)} style={{padding:"9px",borderRadius:10,cursor:"pointer",border:`2px solid ${net===n?cColor.USDT:"#e5e9f5"}`,background:net===n?`${cColor.USDT}10`:"#fafbff",fontWeight:700,fontSize:12,color:net===n?cColor.USDT:"#6b7280"}}>{n}</button>)}
        </div>
      </div>}
      <div style={{background:"#f9fafb",borderRadius:13,padding:18,textAlign:"center",marginBottom:14}}>
        <div style={{width:100,height:100,margin:"0 auto 12px",background:"#fff",borderRadius:10,border:"2px solid #e5e9f5",padding:8,display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {Array.from({length:49},(_,i)=><div key={i} style={{borderRadius:1,background:[0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,47,48,10,15,24,38].includes(i)?"#111827":"transparent"}}/>)}
        </div>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:10}}>Send <strong>{coin}{coin==="USDT"?` (${net})`:""}</strong> only</div>
        <div style={{display:"flex",alignItems:"center",gap:7,background:"#fff",border:"1.5px solid #e5e9f5",borderRadius:9,padding:"9px 12px"}}>
          <span style={{flex:1,fontFamily:"monospace",fontSize:11,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{depAddr}</span>
          <CopyBtn text={depAddr}/>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Amount You Plan to Send</div>
        <div style={{display:"flex",gap:8}}>
          <input type="number" step="any" placeholder="0.00" id="dep-amount"
            style={{flex:1,padding:"9px 12px",border:"1.5px solid #e5e9f5",borderRadius:9,fontSize:13,outline:"none"}}
            onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
          <button onClick={async()=>{
            const amt=(document.getElementById("dep-amount") as HTMLInputElement)?.value;
            if(!amt||parseFloat(amt)<=0){toast.error("Enter the amount you plan to send.");return;}
            const {addDoc,collection,serverTimestamp} = await import("firebase/firestore");
            const {db} = await import("@/lib/firebase/client");
            await addDoc(collection(db,"deposit_requests"),{
              merchantId:ctx.uid,storeId:ctx.storeId,merchantName:ctx.storeName,
              coin,network:coin==="USDT"?net:coin==="BTC"?"Bitcoin":"Ethereum",
              amount:parseFloat(amt),depositAddress:depAddr,
              status:"pending",requestedAt:serverTimestamp(),
            });
            toast.success("Deposit request submitted! Admin will credit your wallet once payment is confirmed.");
          }} style={{padding:"9px 16px",borderRadius:9,border:"none",background:C.blue,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>
            Submit Request
          </button>
        </div>
      </div>
      <div style={{background:"rgba(217,119,6,.06)",border:"1px solid rgba(217,119,6,.2)",borderRadius:11,padding:"11px 14px",fontSize:12,color:"#92400e",lineHeight:1.6}}>
        ⚠ Send {coin} only to this address. After sending, click Submit Request so admin can verify and credit your wallet.
      </div>
    </div>}

    {tab==="withdraw"&&<div style={{...card,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Withdraw Crypto</div>
      <form onSubmit={handleWd}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:7,textTransform:"uppercase",letterSpacing:".5px"}}>Coin</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
            {["BTC","ETH","USDT"].map(c=><button key={c} type="button" onClick={()=>setCoin(c)} style={{padding:"9px 6px",borderRadius:10,cursor:"pointer",border:`2px solid ${coin===c?cColor[c]:"#e5e9f5"}`,background:coin===c?`${cColor[c]}10`:"#fafbff",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:18}}>{cIcon[c]}</span><span style={{fontSize:10,fontWeight:700,color:coin===c?cColor[c]:"#6b7280"}}>{c}</span></button>)}
          </div>
        </div>
        {coin==="USDT"&&<div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Network</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {["TRC20","ERC20"].map(n=><button key={n} type="button" onClick={()=>setNet(n)} style={{padding:"8px",borderRadius:9,cursor:"pointer",border:`2px solid ${net===n?cColor.USDT:"#e5e9f5"}`,background:net===n?`${cColor.USDT}10`:"#fafbff",fontWeight:700,fontSize:11,color:net===n?cColor.USDT:"#6b7280"}}>{n}</button>)}
          </div>
        </div>}
        <div style={{background:"#f9fafb",borderRadius:9,padding:"9px 13px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#6b7280"}}>Available</span>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:14,color:cColor[coin]}}>{cSym[coin]}{selBal.toFixed(coin==="BTC"?5:4)}</span>
        </div>
        <label style={lbl}>Destination Address</label>
        <input value={wdAddr} onChange={e=>setWdAddr(e.target.value)} placeholder={`Your ${coin} address`} style={{...inp,fontFamily:"monospace"}} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <label style={lbl}>Amount ({coin})</label>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontFamily:"monospace",fontSize:14,color:"#9ca3af"}}>{cSym[coin]}</span>
          <input type="number" step="any" value={wdAmt} onChange={e=>setWdAmt(e.target.value)} placeholder="0.00" style={{...inp,marginBottom:0,paddingLeft:30}} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
          <button type="button" onClick={()=>setWdAmt(String(Math.max(0,selBal-0.001).toFixed(coin==="BTC"?5:4)))} style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",padding:"3px 7px",borderRadius:5,border:"1px solid #e5e9f5",background:"#f3f4f6",color:"#6b7280",fontSize:9,fontWeight:700,cursor:"pointer"}}>MAX</button>
        </div>
        <button type="submit" disabled={sub} style={{width:"100%",padding:"12px",borderRadius:11,border:"none",background:sub?"#93c5fd":"linear-gradient(135deg,#2563eb,#7c3aed)",color:"#fff",fontWeight:700,fontSize:14,cursor:sub?"not-allowed":"pointer"}}>{sub?"Submitting…":"Submit Withdrawal →"}</button>
        <p style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:6}}>Reviewed by admin within 24 hours.</p>
      </form>
    </div>}

    {tab==="history"&&<div style={{...card,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Withdrawal Requests</div>
      {wds.length===0?<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:32,marginBottom:6}}>💸</div><div style={{fontWeight:700,color:"#6b7280",fontSize:13}}>No withdrawals yet</div></div>:
      wds.map(w=>(
        <div key={w.id} style={{padding:"13px 0",borderBottom:"1px solid #f3f4f6"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{fontSize:15}}>{cIcon[w.coin]}</span><span style={{fontWeight:700,fontSize:13,color:cColor[w.coin]}}>{w.amount} {w.coin}</span><WdBadge s={w.status}/></div>
              <div style={{fontFamily:"monospace",fontSize:10,color:"#9ca3af"}}>{w.network} · {w.requestedAt?.toDate?.().toLocaleDateString()}</div>
              {w.rejectionReason&&<div style={{marginTop:5,padding:"5px 9px",background:"rgba(220,38,38,.06)",borderRadius:7,fontSize:11,color:C.red}}>Reason: {w.rejectionReason}</div>}
            </div>
            <div style={{fontWeight:700,fontSize:14,color:C.green}}>${w.usdValue.toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>}
  </div>);
}
