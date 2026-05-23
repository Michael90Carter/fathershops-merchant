// app/merchant/settings/page.tsx
"use client";
import { useState, useEffect } from "react";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { useMerchant } from "../layout";
import { useMerchantStore, useMerchantKYC } from "@/lib/hooks";
import toast from "react-hot-toast";

const C={blue:"#2563eb",green:"#16a34a",red:"#dc2626",amber:"#d97706"};
const PLAN_INFO:Record<string,{l:string,price:string,comm:string,max:string,c:string}>={
  starter:{l:"Starter",price:"$9/mo",comm:"3%",max:"10 products",c:"#6b7280"},
  growth:{l:"Growth",price:"$19/mo",comm:"2.5%",max:"50 products",c:"#0284c7"},
  pro:{l:"Pro",price:"$29/mo",comm:"2%",max:"Unlimited",c:"#7c3aed"},
};

function Toggle({label,desc,on}:{label:string;desc:string;on:boolean}){
  const [a,setA]=useState(on);
  return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
    <div><div style={{fontSize:13,fontWeight:600}}>{label}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{desc}</div></div>
    <div onClick={()=>setA(v=>!v)} style={{width:40,height:23,borderRadius:99,cursor:"pointer",background:a?C.blue:"#e5e7eb",display:"flex",alignItems:"center",justifyContent:a?"flex-end":"flex-start",padding:"0 2px",transition:"all .2s",flexShrink:0}}>
      <div style={{width:19,height:19,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}/>
    </div>
  </div>);
}

export default function SettingsPage(){
  const ctx=useMerchant();const router=useRouter();
  const {store}=useMerchantStore(ctx.uid);
  const {kyc}=useMerchantKYC(ctx.uid);
  const [name,setName]=useState(ctx.name);
  const [phone,setPhone]=useState("");
  const [oldPw,setOldPw]=useState("");const [newPw,setNewPw]=useState("");
  const [savingP,setSavingP]=useState(false);const [savingPw,setSavingPw]=useState(false);

  useEffect(()=>{ getDoc(doc(db,"users",ctx.uid)).then(s=>{ if(s.exists())setPhone(s.data().phone??""); }); },[ctx.uid]);

  async function saveProfile(e:React.FormEvent){e.preventDefault();setSavingP(true);try{await updateDoc(doc(db,"users",ctx.uid),{displayName:name,phone});toast.success("Profile updated!");}catch{toast.error("Failed.");}setSavingP(false);}
  async function changePw(e:React.FormEvent){e.preventDefault();if(newPw.length<8){toast.error("Min 8 characters.");return;}setSavingPw(true);try{const u=auth.currentUser!;await reauthenticateWithCredential(u,EmailAuthProvider.credential(u.email!,oldPw));await updatePassword(u,newPw);toast.success("Password changed!");setOldPw("");setNewPw("");}catch(err:any){toast.error(err.code==="auth/invalid-credential"?"Wrong current password.":"Failed.");}setSavingPw(false);}

  const plan=store?.plan??"starter";const pi=PLAN_INFO[plan];
  const card:React.CSSProperties={background:"#fff",border:"1px solid #e5e9f5",borderRadius:14,padding:18,marginBottom:12};
  const inp:React.CSSProperties={width:"100%",padding:"9px 12px",border:"1.5px solid #e5e9f5",borderRadius:9,fontSize:13,outline:"none",marginBottom:12,transition:"border .15s"};
  const lbl:React.CSSProperties={display:"block",fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"};

  return(<div>
    <div className="fu" style={{marginBottom:18}}><h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px"}}>Settings</h1></div>

    {/* Store info */}
    <div className="fu d1" style={card}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #f3f4f6"}}>
        <div style={{width:48,height:48,borderRadius:12,background:C.blue,color:"#fff",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ctx.storeName.slice(0,2).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:16}}>{ctx.storeName}</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{store?.domain??"—"} · {store?.category}</div>
        </div>
        <div>
          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",color:pi.c,background:`${pi.c}18`}}>{pi.l}</span>
          <div style={{fontSize:11,color:store?.status==="active"?C.green:store?.status==="blocked"?C.red:C.amber,fontWeight:700,marginTop:4,textAlign:"right"}}>{store?.status??"—"}</div>
        </div>
      </div>
      {[["Plan",`${pi.l} · ${pi.price}`],["Commission",pi.comm],["Max Products",pi.max],["Merchant Margin","20%"],["Currency",store?.settings?.currency??"USD"],["Joined",store?.joinedAt?.toDate?.().toLocaleDateString()??"—"]].map(([k,v])=>(
        <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f3f4f6"}}>
          <span style={{fontSize:13,color:"#6b7280"}}>{k}</span>
          <span style={{fontSize:13,fontWeight:700}}>{v}</span>
        </div>
      ))}
    </div>

    {/* KYC status */}
    {kyc&&<div className="fu d2" style={{...card,border:`1px solid ${kyc.status==="approved"?"rgba(22,163,74,.25)":kyc.status==="rejected"?"rgba(220,38,38,.25)":"rgba(217,119,6,.25)"}`}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>KYC / ID Verification</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>{kyc.status==="approved"?"✅":kyc.status==="rejected"?"❌":"⏳"}</span>
        <div>
          <div style={{fontWeight:600,fontSize:13,textTransform:"capitalize"}}>{kyc.status}</div>
          <div style={{fontSize:12,color:"#6b7280"}}>{kyc.idType?.replace("_"," ")} · {kyc.idNumber}</div>
        </div>
      </div>
      {kyc.rejectionReason&&<div style={{marginTop:8,padding:"8px 12px",background:"rgba(220,38,38,.06)",borderRadius:8,fontSize:12,color:C.red}}>Reason: {kyc.rejectionReason}</div>}
    </div>}

    {/* Profile */}
    <div className="fu d3" style={card}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Profile</div>
      <form onSubmit={saveProfile}>
        <label style={lbl}>Full Name</label>
        <input style={inp} value={name} onChange={e=>setName(e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <label style={lbl}>Email</label>
        <input style={{...inp,background:"#f9fafb",color:"#9ca3af"}} value={ctx.email} disabled/>
        <label style={lbl}>Phone</label>
        <input style={{...inp,marginBottom:0}} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <button type="submit" disabled={savingP} style={{marginTop:12,padding:"9px 20px",borderRadius:9,border:"none",background:C.blue,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:savingP?.6:1}}>{savingP?"Saving…":"Save Profile"}</button>
      </form>
    </div>

    {/* Password */}
    <div className="fu d4" style={card}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Change Password</div>
      <form onSubmit={changePw}>
        <label style={lbl}>Current Password</label>
        <input style={inp} type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} placeholder="••••••••" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <label style={lbl}>New Password</label>
        <input style={{...inp,marginBottom:0}} type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 8 characters" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <button type="submit" disabled={savingPw} style={{marginTop:12,padding:"9px 20px",borderRadius:9,border:"none",background:C.blue,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:savingPw?.6:1}}>{savingPw?"Updating…":"Update Password"}</button>
      </form>
    </div>

    {/* Notifications */}
    <div className="fu d5" style={card}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Notifications</div>
      <Toggle label="New Order Alerts"     desc="Notify when you receive a new order"      on={true}/>
      <Toggle label="Withdrawal Updates"   desc="Notify when admin reviews withdrawals"     on={true}/>
      <Toggle label="Deposit Confirmation" desc="Notify when crypto deposit confirmed"      on={true}/>
      <Toggle label="Weekly Report"        desc="Receive weekly sales summary email"        on={true}/>
      <Toggle label="Low Stock Alerts"     desc="Alert when product stock falls below 10"  on={false}/>
    </div>

    {/* Sign out */}
    <div className="fu d6" style={{...card,border:"1px solid rgba(220,38,38,.2)"}}>
      <div style={{fontWeight:700,fontSize:14,color:C.red,marginBottom:6}}>Account</div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Signed in as <strong style={{color:"#111827"}}>{ctx.email}</strong></div>
      <button onClick={async()=>{await signOut(auth);router.replace("/login");}} style={{background:"rgba(220,38,38,.06)",color:C.red,border:"1px solid rgba(220,38,38,.25)",borderRadius:9,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Sign Out</button>
    </div>
  </div>);
}
