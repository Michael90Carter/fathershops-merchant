// app/merchant/stores/page.tsx
"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const C={blue:"#1a56db",green:"#16a34a",amber:"#d97706",red:"#dc2626",violet:"#7c3aed"};

export default function StoresPage() {
  const [stores, setStores]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState("rating");
  const [selected, setSelected] = useState<any>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loadingP, setLoadingP] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db,"stores"), where("status","==","active")))
      .then(snap => {
        setStores(snap.docs.map(d=>({id:d.id,...d.data()})));
        setLoading(false);
      }).catch(()=>setLoading(false));
  },[]);

  async function viewStore(store:any) {
    setSelected(store);
    setLoadingP(true);
    const snap = await getDocs(query(collection(db,"store_products"),
      where("storeId","==",store.id),where("isVisible","==",true)));
    setStoreProducts(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoadingP(false);
  }

  let filtered = stores.filter(s =>
    !search || s.storeName?.toLowerCase().includes(search.toLowerCase()) ||
    s.country?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );
  if (sort==="rating")   filtered=[...filtered].sort((a,b)=>(b.rating??0)-(a.rating??0));
  if (sort==="orders")   filtered=[...filtered].sort((a,b)=>(b.totalOrders??0)-(a.totalOrders??0));
  if (sort==="products") filtered=[...filtered].sort((a,b)=>(b.productCount??0)-(a.productCount??0));

  const card:React.CSSProperties={background:"#fff",border:"1px solid #e5e9f5",borderRadius:14};

  if (selected) return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setSelected(null);setStoreProducts([]);}} style={{width:36,height:36,borderRadius:9,border:"1px solid #e5e9f5",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>←</button>
        <div>
          <h1 style={{fontWeight:800,fontSize:20,letterSpacing:"-.3px",marginBottom:2}}>{selected.storeName}</h1>
          <div style={{fontSize:12,color:"#6b7280"}}>{selected.category} · {selected.country}</div>
        </div>
      </div>

      {/* Store stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:16}}>
        {[
          {l:"Rating",    v:`${"★".repeat(Math.round(selected.rating??0))||"☆☆☆☆☆"}`, sub:`${(selected.rating??0).toFixed(1)}/5.0`, c:C.amber},
          {l:"Orders",    v:selected.totalOrders??0,   sub:"total orders",     c:C.blue},
          {l:"On-Time",   v:`${selected.onTimeOrders??0}/${selected.totalOrders??0}`, sub:"deliveries",  c:C.green},
          {l:"Products",  v:storeProducts.length,       sub:"listed",           c:C.violet},
          {l:"Plan",      v:(selected.plan??"starter").toUpperCase(), sub:"subscription",  c:"#6b7280"},
        ].map(s=>(
          <div key={s.l} style={{...card,padding:12,textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:s.l==="Rating"?13:18,color:s.c,marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:10,color:"#6b7280"}}>{s.l}</div>
            <div style={{fontSize:9,color:"#9ca3af",marginTop:1}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Store products */}
      <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Products in this store ({storeProducts.length})</div>
      {loadingP?<div style={{textAlign:"center",padding:"32px 0",color:"#9ca3af"}}>Loading products…</div>:
      storeProducts.length===0?<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>📭</div><div style={{color:"#6b7280",fontSize:14}}>No visible products</div></div>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
          {storeProducts.map(p=>{
            const img=p.productImage?.startsWith("http")?p.productImage:null;
            return(
              <div key={p.id} style={{...card,overflow:"hidden"}}>
                <div style={{height:140,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,overflow:"hidden"}}>
                  {img?<img src={img} alt={p.productName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:p.productImage||"📦"}
                </div>
                <div style={{padding:"10px 12px"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.productName}</div>
                  <div style={{fontFamily:"monospace",fontWeight:800,fontSize:15,color:C.green}}>${p.retailPrice?.toFixed(2)}</div>
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{p.vendorName}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return(
    <div>
      <div className="fu" style={{marginBottom:20}}>
        <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:4}}>Merchant Stores</h1>
        <p style={{color:"#6b7280",fontSize:13}}>Browse other merchants, view their products and store performance</p>
      </div>

      {/* Search + sort */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stores, categories, countries…"
          style={{flex:"1 1 200px",padding:"10px 13px",border:"1.5px solid #e5e9f5",borderRadius:10,fontSize:13,outline:"none",background:"#fff"}}
          onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:"10px 13px",border:"1.5px solid #e5e9f5",borderRadius:10,fontSize:13,outline:"none",background:"#fff",cursor:"pointer"}}>
          <option value="rating">Sort: Top Rated</option>
          <option value="orders">Sort: Most Orders</option>
          <option value="products">Sort: Most Products</option>
        </select>
      </div>

      {/* Platform stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:18}}>
        {[
          {l:"Active Stores",   v:stores.length,                                          c:C.blue},
          {l:"Avg Rating",      v:`${(stores.reduce((a,s)=>a+(s.rating??0),0)/Math.max(stores.length,1)).toFixed(1)}★`, c:C.amber},
          {l:"Total Orders",    v:stores.reduce((a,s)=>a+(s.totalOrders??0),0),           c:C.green},
          {l:"Countries",       v:[...new Set(stores.map(s=>s.country))].length,          c:C.violet},
        ].map(s=>(
          <div key={s.l} style={{...card,padding:14,textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:20,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af"}}>Loading stores…</div>:
      filtered.length===0?<div style={{...card,padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🏪</div><div style={{fontWeight:700,color:"#6b7280"}}>No stores found</div></div>:(
        <div style={{display:"grid",gap:12}}>
          {filtered.map((s,i)=>(
            <div key={s.id} className={`fu d${Math.min(i%5+1,5)}`} style={{...card,padding:16,cursor:"pointer",transition:"all .2s"}}
              onClick={()=>viewStore(s)}
              onMouseEnter={e=>(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)")}
              onMouseLeave={e=>(e.currentTarget.style.boxShadow="none")}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                {/* Avatar */}
                <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${C.blue},${C.violet})`,color:"#fff",fontWeight:800,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {s.storeName?.slice(0,2).toUpperCase()}
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:120}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{s.storeName}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>{s.category} · {s.country}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:C.amber}}>{"★".repeat(Math.round(s.rating??0))||"☆☆☆☆☆"} {(s.rating??0).toFixed(1)}</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>·</span>
                    <span style={{fontSize:11,color:"#6b7280"}}>{s.totalOrders??0} orders</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>·</span>
                    <span style={{fontSize:11,color:C.blue}}>{s.plan??"starter"} plan</span>
                  </div>
                </div>
                {/* Stats */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flexShrink:0}}>
                  {[
                    {l:"On-Time Rate", v:s.totalOrders>0?`${Math.round(((s.onTimeOrders??0)/(s.totalOrders??1))*100)}%`:"—", c:C.green},
                    {l:"Deliveries",   v:s.onTimeOrders??0,        c:C.blue},
                  ].map(st=>(
                    <div key={st.l} style={{background:"#f9fafb",borderRadius:8,padding:"8px 10px",textAlign:"center",border:"1px solid #e5e9f5"}}>
                      <div style={{fontWeight:700,fontSize:14,color:st.c}}>{st.v}</div>
                      <div style={{fontSize:9,color:"#9ca3af",marginTop:1}}>{st.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{flexShrink:0,fontSize:18,color:"#9ca3af"}}>→</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
