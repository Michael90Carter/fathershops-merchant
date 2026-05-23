// app/signup/page.tsx — Authentic merchant signup, 4 steps
"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C = { blue:"#1a56db", violet:"#7c3aed", green:"#16a34a" };

const COUNTRIES = ["United States","United Kingdom","Canada","Australia","Germany","France","UAE","Saudi Arabia","Nigeria","Kenya","Ghana","South Africa","India","Singapore","Malaysia","Philippines","Indonesia","Brazil","Mexico","Pakistan","Egypt","Morocco","Jordan","Turkey","Netherlands","Spain","Italy","Sweden","Norway","Switzerland","Japan","South Korea","China","Hong Kong","Thailand","Vietnam","Argentina","Colombia","Other"];
const CATEGORIES = ["Electronics & Accessories","Men's Clothing","Women's Clothing","Men's Shoes","Women's Shoes","Men's Bags","Women's Bags","Fitness & Sports","Kitchen & Home","Kids & Baby","Beauty & Skincare","General & Lifestyle"];
const ID_TYPES = [{v:"passport",l:"Passport"},{v:"national_id",l:"National ID Card"},{v:"drivers_license",l:"Driver's License"}];

const blank = {
  name:"", email:"", password:"", confirm:"", phone:"",
  storeName:"", domain:"", category:"Electronics & Accessories", country:"",
  idType:"passport", idNumber:"", dateOfBirth:"", idExpiry:"", address:"",
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState(blank);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function validate(s: number) {
    if (s === 1) {
      if (!form.name.trim())  { toast.error("Full name is required."); return false; }
      if (!form.email.trim()) { toast.error("Email address is required."); return false; }
      if (!form.password)     { toast.error("Password is required."); return false; }
      if (form.password.length < 8) { toast.error("Password must be at least 8 characters."); return false; }
      if (form.password !== form.confirm) { toast.error("Passwords do not match."); return false; }
    }
    if (s === 2) {
      if (!form.storeName.trim()) { toast.error("Store name is required."); return false; }
      if (!form.domain.trim())    { toast.error("Store domain is required."); return false; }
      if (!form.country)          { toast.error("Please select your country."); return false; }
    }
    if (s === 3) {
      if (!form.idNumber.trim())   { toast.error("ID number is required."); return false; }
      if (!form.dateOfBirth)       { toast.error("Date of birth is required."); return false; }
    }
    return true;
  }

  async function submit() {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid  = cred.user.uid;
      await setDoc(doc(db, "users", uid), {
        uid, email:form.email, displayName:form.name, role:"merchant",
        phone:form.phone, country:form.country, kycVerified:false,
        createdAt:serverTimestamp(), lastLogin:serverTimestamp(),
      });
      const storeRef = await addDoc(collection(db, "stores"), {
        merchantId:uid, storeName:form.storeName,
        domain:`${form.domain}.fathershops.com`,
        category:form.category, country:form.country,
        plan:"starter", status:"pending",
        commissionRate:0.03, merchantMargin:0.20,
        maxProducts:10, rating:0, totalOrders:0, onTimeOrders:0,
        joinedAt:serverTimestamp(), settings:{ currency:"USD", salesTarget:10000, deliveryDays:3 },
      });
      await addDoc(collection(db, "kyc_submissions"), {
        merchantId:uid, storeId:storeRef.id,
        storeName:form.storeName, merchantName:form.name, merchantEmail:form.email,
        idType:form.idType, idNumber:form.idNumber, dateOfBirth:form.dateOfBirth,
        issuingCountry:form.country, idExpiryDate:form.idExpiry,
        fullAddress:form.address, country:form.country,
        idFrontUrl:"", idBackUrl:"", status:"pending", submittedAt:serverTimestamp(),
      });
      await addDoc(collection(db, "wallets"), {
        merchantId:uid, storeId:storeRef.id,
        balances:{ BTC:0, ETH:0, USDT_TRC20:0, USDT_ERC20:0 }, usdEquivalent:0, updatedAt:serverTimestamp(),
      });
      for (const a of [
        {coin:"BTC",network:"Bitcoin",  address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"},
        {coin:"ETH",network:"Ethereum", address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F"},
        {coin:"USDT",network:"TRC20",   address:"TJf8qX7KPxLmPzQo5YGWN3cB9RmXaVuTe"},
        {coin:"USDT",network:"ERC20",   address:"0x4aB8c3F2d1E9A7c056D3e4F891bC2A5d6E7f8012"},
      ]) {
        await addDoc(collection(db, "deposit_addresses"), {
          merchantId:uid, storeId:storeRef.id, ...a, isActive:true, createdAt:serverTimestamp(),
        });
      }
      await addDoc(collection(db, "notifications"), {
        userId:uid, title:"🎉 Welcome to FatherShops!", read:false, type:"kyc",
        body:`Hi ${form.name.split(" ")[0]}, your store "${form.storeName}" is being reviewed. We'll notify you once it's live (usually within 24 hours).`,
        createdAt:serverTimestamp(),
      });
      toast.success("Store created! We'll review your ID and activate it within 24 hours.");
      router.push("/merchant/dashboard");
    } catch (err: any) {
      toast.error(
        err.code === "auth/email-already-in-use" ? "An account with this email already exists." :
        err.code === "auth/weak-password" ? "Password is too weak. Use at least 8 characters." :
        "Registration failed. Please try again."
      );
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"12px 14px", border:"1.5px solid #e5e7eb",
    borderRadius:10, fontSize:14, outline:"none", color:"#111827",
    background:"#fff", transition:"border .2s", marginBottom:14, boxSizing:"border-box" as const,
  };
  const lbl: React.CSSProperties = {
    display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5,
  };
  const sel: React.CSSProperties = { ...inp, cursor:"pointer", background:"#fff" };

  const STEPS = ["Account","Your Store","Verify ID","Review"];
  const pct   = ((step - 1) / 3) * 100;

  return (
    <div style={{
      minHeight:"100vh", background:"#f9fafb",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 16px",
      fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      <div style={{ width:"100%", maxWidth:520 }}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Link href="http://localhost:3002" style={{ display:"inline-flex", alignItems:"center", gap:8, textDecoration:"none", marginBottom:16 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#1a56db,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <span style={{ fontWeight:900, fontSize:20, color:"#111827", letterSpacing:"-.3px" }}>FatherShops</span>
          </Link>
          <h1 style={{ fontWeight:800, fontSize:24, color:"#111827", marginBottom:4, letterSpacing:"-.3px" }}>Create your store</h1>
          <p style={{ color:"#6b7280", fontSize:14 }}>Free to join · No monthly fees · Earn 20% on every sale</p>
        </div>

        {/* Progress */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                <div style={{
                  width:28, height:28, borderRadius:"50%", marginBottom:4,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700,
                  background: step > i+1 ? C.blue : step === i+1 ? C.blue : "#e5e7eb",
                  color: step >= i+1 ? "#fff" : "#9ca3af",
                }}>
                  {step > i+1 ? "✓" : i+1}
                </div>
                <div style={{ fontSize:9, fontWeight:600, color:step >= i+1 ? C.blue : "#9ca3af", textAlign:"center" }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ height:3, background:"#e5e7eb", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.blue},${C.violet})`, borderRadius:99, transition:"width .4s" }}/>
          </div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,.08)", border:"1px solid #e5e7eb" }}>
          {/* STEP 1 */}
          {step === 1 && <>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>Account Details</div>
            <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Create your secure merchant account</p>
            <label style={lbl}>Full Name *</label>
            <input style={inp} placeholder="John Smith" value={form.name} onChange={e=>set("name",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            <label style={lbl}>Email Address *</label>
            <input style={inp} type="email" placeholder="john@example.com" value={form.email} onChange={e=>set("email",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            <label style={lbl}>Phone Number</label>
            <input style={inp} type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={e=>set("phone",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            <label style={lbl}>Password *</label>
            <div style={{ position:"relative" }}>
              <input style={{...inp,paddingRight:44}} type={showPw?"text":"password"} placeholder="At least 8 characters" value={form.password} onChange={e=>set("password",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-60%)",background:"transparent",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:16}}>{showPw?"🙈":"👁"}</button>
            </div>
            <label style={lbl}>Confirm Password *</label>
            <input style={{...inp,marginBottom:0}} type="password" placeholder="Repeat password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
          </>}

          {/* STEP 2 */}
          {step === 2 && <>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>Store Details</div>
            <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Set up your online storefront</p>
            <label style={lbl}>Store Name *</label>
            <input style={inp} placeholder="e.g. TrendHive Store" value={form.storeName} onChange={e=>set("storeName",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            <label style={lbl}>Store URL Handle *</label>
            <div style={{ position:"relative", marginBottom:14 }}>
              <input style={{...inp,marginBottom:0,paddingRight:170}} placeholder="mystore" value={form.domain} onChange={e=>set("domain",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#9ca3af",pointerEvents:"none" }}>.fathershops.com</span>
            </div>
            <label style={lbl}>Product Category</label>
            <select style={sel} value={form.category} onChange={e=>set("category",e.target.value)}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <label style={lbl}>Country *</label>
            <select style={{...sel,marginBottom:0}} value={form.country} onChange={e=>set("country",e.target.value)}>
              <option value="">Select your country</option>
              {COUNTRIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </>}

          {/* STEP 3 */}
          {step === 3 && <>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>Identity Verification</div>
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 14px", marginBottom:20, fontSize:13, color:"#1d4ed8", lineHeight:1.6 }}>
              🛡️ We verify your identity to keep the platform safe for everyone. Your information is encrypted and never shared.
            </div>
            <label style={lbl}>ID Type *</label>
            <select style={sel} value={form.idType} onChange={e=>set("idType",e.target.value)}>
              {ID_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <label style={lbl}>ID Number *</label>
            <input style={inp} placeholder="e.g. A12345678" value={form.idNumber} onChange={e=>set("idNumber",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={lbl}>Date of Birth *</label>
                <input style={{...inp,marginBottom:0}} type="date" value={form.dateOfBirth} onChange={e=>set("dateOfBirth",e.target.value)}/>
              </div>
              <div>
                <label style={lbl}>ID Expiry Date</label>
                <input style={{...inp,marginBottom:0}} type="date" value={form.idExpiry} onChange={e=>set("idExpiry",e.target.value)}/>
              </div>
            </div>
            <div style={{ marginTop:14 }}>
              <label style={lbl}>Residential Address</label>
              <input style={{...inp,marginBottom:0}} placeholder="123 Main St, City, ZIP" value={form.address} onChange={e=>set("address",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            </div>
          </>}

          {/* STEP 4 */}
          {step === 4 && <>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>Review & Launch</div>
            <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Confirm your details before creating your store</p>
            <div style={{ background:"#f9fafb", borderRadius:12, padding:16, marginBottom:16 }}>
              {[
                ["Name",       form.name],
                ["Email",      form.email],
                ["Store",      form.storeName],
                ["URL",        `${form.domain}.fathershops.com`],
                ["Category",   form.category],
                ["Country",    form.country],
                ["ID Type",    ID_TYPES.find(t=>t.v===form.idType)?.l??""],
                ["ID Number",  form.idNumber],
                ["Date of Birth", form.dateOfBirth],
              ].map(([k, v]) => (
                <div key={k as string} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #e5e7eb" }}>
                  <span style={{ fontSize:13, color:"#6b7280" }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#111827", textAlign:"right", maxWidth:"55%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v||"—"}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#166534", lineHeight:1.7 }}>
              ✅ Your crypto wallet will be created automatically<br/>
              ⏳ Store review takes up to 24 hours<br/>
              📋 No document upload required — ID number only
            </div>
          </>}

          {/* Navigation */}
          <div style={{ display:"flex", gap:10, marginTop:24 }}>
            {step > 1 && (
              <button onClick={() => setStep(s=>s-1)} style={{ flex:1, padding:"12px", borderRadius:10, border:"1.5px solid #e5e7eb", background:"transparent", color:"#374151", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                ← Back
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => { if (validate(step)) setStep(s=>s+1); }}
                style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${C.blue},${C.violet})`, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                Continue →
              </button>
            ) : (
              <button onClick={submit} disabled={loading}
                style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:loading?"#93c5fd":`linear-gradient(135deg,${C.blue},${C.violet})`, color:"#fff", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?.7:1 }}>
                {loading ? "Creating store…" : "🚀 Launch My Store"}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#6b7280" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color:C.blue, fontWeight:700, textDecoration:"none" }}>Sign in</Link>
        </p>
      </div>

      <style>{`
        input::placeholder, select option:first-child { color:#9ca3af; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}
