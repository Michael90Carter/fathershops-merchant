// app/merchant/products/page.tsx
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMerchant } from "../layout";
import { useStoreProducts, useCatalog, addToStore, removeFromStore, updateRetailPrice, toggleVisibility } from "@/lib/hooks";
import toast from "react-hot-toast";

const C={blue:"#1a56db",green:"#16a34a",amber:"#d97706",red:"#dc2626",violet:"#7c3aed"};
const CATS=["All","Electronics","Men Clothing","Female Clothing","Bags - Men","Bags - Women","Kitchen","Kids Clothes","General"];

// ── Product Detail Modal ──────────────────────────────────────
function ProductModal({ p, inStore, storeProduct, onAdd, onRemove, onClose, acting }:
  { p:any; inStore:boolean; storeProduct:any; onAdd:()=>void; onRemove:()=>void; onClose:()=>void; acting:boolean }) {

  const hasImage = p.images?.[0]?.startsWith("http");
  const margin = (p.suggestedRetail??0) > 0 ? Math.round(((p.suggestedRetail - p.basePrice)/p.suggestedRetail)*100) : 20;



  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0,backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.2)"}}>
        {/* Image */}
        <div style={{position:"relative",height:220,background:"#f3f4f6",overflow:"hidden",borderRadius:"20px 20px 0 0",flexShrink:0}}>
          {hasImage ? (
            <img src={p.images[0]} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          ) : (
            <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,background:"linear-gradient(135deg,#eff6ff,#f5f0ff)"}}>{p.images?.[0]||"📦"}</div>
          )}
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.4)",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>
          <div style={{position:"absolute",bottom:12,left:12,background:"rgba(0,0,0,.5)",borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff",backdropFilter:"blur(4px)"}}>{p.category}</div>
          {p.stock!==undefined&&<div style={{position:"absolute",bottom:12,right:12,background:p.stock>20?"rgba(22,163,74,.8)":p.stock>5?"rgba(217,119,6,.8)":"rgba(220,38,38,.8)",borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff"}}>{p.stock>0?`${p.stock} in stock`:"Out of stock"}</div>}
        </div>
        {/* Content */}
        <div style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:3,letterSpacing:"-.3px"}}>{p.name}</div>
              <div style={{fontSize:13,color:"#6b7280"}}>{p.vendorName}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontWeight:900,fontSize:24,color:C.green,letterSpacing:"-.5px"}}>${(p.suggestedRetail??0).toFixed(2)}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>Base ${(p.basePrice??0).toFixed(2)}</div>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
            {[
              {l:"Vendor Cost",  v:`$${(p.basePrice??0).toFixed(2)}`,      c:"#374151"},
              {l:"Retail Price", v:`$${(p.suggestedRetail??0).toFixed(2)}`, c:C.green},
              {l:"Your Margin",  v:`${margin}%`,                            c:C.amber},
            ].map(s=>(
              <div key={s.l} style={{background:"#f9fafb",borderRadius:10,padding:"10px 12px",textAlign:"center",border:"1px solid #e5e7eb"}}>
                <div style={{fontFamily:"monospace",fontWeight:800,fontSize:15,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {p.description&&<div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".5px"}}>About this product</div>
            <div style={{fontSize:13,color:"#374151",lineHeight:1.7,background:"#f9fafb",borderRadius:10,padding:"12px 14px",border:"1px solid #e5e7eb"}}>{p.description}</div>
          </div>}

          {/* Tags */}
          {p.tags?.length>0&&<div style={{marginBottom:14}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.tags.map((t:string)=>(
                <span key={t} style={{background:`${C.blue}10`,color:C.blue,borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:600}}>#{t}</span>
              ))}
            </div>
          </div>}

          {/* Price is fixed by admin — show info only */}
          {inStore&&<div style={{background:"#eff6ff",borderRadius:12,padding:"12px 14px",marginBottom:14,border:`1px solid ${C.blue}30`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:4,textTransform:"uppercase" as const,letterSpacing:".5px"}}>Price (Admin Fixed)</div>
            <div style={{fontFamily:"monospace",fontWeight:900,fontSize:22,color:C.blue}}>${(p.suggestedRetail??p.retailPrice??0).toFixed(2)}</div>
            <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>Price is set by admin · You earn 20% profit = <strong style={{color:C.green}}>${((p.suggestedRetail??p.retailPrice??0)*0.20).toFixed(2)}</strong> per sale</div>
          </div>}

          {/* CTA */}
          <button onClick={inStore?onRemove:onAdd} disabled={acting}
            style={{width:"100%",padding:"13px",borderRadius:12,border:"none",fontWeight:700,fontSize:16,cursor:acting?"not-allowed":"pointer",
              background:inStore?"rgba(220,38,38,.08)":`linear-gradient(135deg,${C.blue},${C.violet})`,
              color:inStore?C.red:"#fff",
              border:inStore?"1.5px solid rgba(220,38,38,.3)":"none",
              opacity:acting?.7:1,marginBottom:8}}>
            {acting?"Processing…":inStore?"✕ Remove from My Store":"+ Add to My Store"}
          </button>
          {inStore&&<button onClick={()=>toggleVisibility(storeProduct.id,storeProduct.isVisible).then(()=>toast.success(storeProduct.isVisible?"Hidden from store.":"Now visible in store."))}
            style={{width:"100%",padding:"10px",borderRadius:12,border:"1.5px solid #e5e7eb",background:"transparent",color:"#6b7280",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            {storeProduct.isVisible?"Hide from Store":"Show in Store"}
          </button>}
        </div>
      </div>
    </div>
  );
}

// ── Catalog Product Card ──────────────────────────────────────
function CatalogCard({ p, inStore, storeProduct, onView, onAdd, onRemove, acting }:
  { p:any; inStore:boolean; storeProduct:any; onView:()=>void; onAdd:()=>void; onRemove:()=>void; acting:boolean }) {
  const [hover,setHover]=useState(false);
  const hasImage=p.images?.[0]?.startsWith("http");
  const margin=(p.suggestedRetail??0)>0?Math.round(((p.suggestedRetail-p.basePrice)/p.suggestedRetail)*100):20;
  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:"#fff",border:`${inStore?`2px solid ${C.blue}`:`1px solid #e5e9f5`}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",transform:hover?"translateY(-2px)":"none",boxShadow:hover?"0 8px 24px rgba(0,0,0,.1)":inStore?"0 2px 12px rgba(26,86,219,.1)":"none"}}>
      {/* Image with front/back switcher on hover */}
      {(()=>{
        const imgs=p.images?.filter((i:string)=>i&&i!=="📦").filter((i:string)=>i.startsWith("http"))||[];
        const img1=imgs[0];const img2=imgs[1];
        return(
          <div onClick={onView} style={{position:"relative",height:180,background:"#f3f4f6",overflow:"hidden"}}>
            {img1?(
              <>
                <img src={img1} alt={p.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transition:"opacity .35s",opacity:hover&&img2?0:1}}/>
                {img2&&<img src={img2} alt={`${p.name} variant`} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transition:"opacity .35s",opacity:hover?1:0}}/>}
                {img2&&!hover&&<div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.5)",borderRadius:6,padding:"2px 6px",fontSize:9,color:"rgba(255,255,255,.9)",fontWeight:600,backdropFilter:"blur(4px)"}}>+1 photo</div>}
              </>
            ):(
              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64,background:"linear-gradient(135deg,#eff6ff,#f5f0ff)"}}>{p.images?.[0]||"📦"}</div>
            )}
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",opacity:hover?1:0,transition:"opacity .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"7px 16px",color:"#fff",fontWeight:700,fontSize:12,backdropFilter:"blur(4px)"}}>{img2&&hover?"Variant view →":"View Details"}</div>
            </div>
            <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,.5)",borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#fff",backdropFilter:"blur(4px)"}}>{p.category}</div>
            {inStore&&<div style={{position:"absolute",top:10,right:10,background:C.blue,borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#fff"}}>✓ In Store</div>}
            {!inStore&&p.stock!==undefined&&p.stock<10&&p.stock>0&&<div style={{position:"absolute",top:10,right:10,background:"rgba(220,38,38,.8)",borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#fff"}}>Low stock</div>}
          </div>
        );
      })()}
      {/* Info */}
      <div style={{padding:"12px 14px 10px"}} onClick={onView}>
        <div style={{fontWeight:700,fontSize:14,color:"#111827",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>{p.vendorName}</div>
        {p.description&&<div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.description}</div>}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"monospace",fontWeight:900,fontSize:18,color:C.green}}>${(p.suggestedRetail??0).toFixed(2)}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>Cost ${(p.basePrice??0).toFixed(2)}</div>
          </div>
          <div style={{background:`${C.amber}15`,borderRadius:8,padding:"4px 10px",textAlign:"center"}}>
            <div style={{fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.amber}}>{margin}%</div>
            <div style={{fontSize:9,color:"#9ca3af"}}>margin</div>
          </div>
        </div>
      </div>
      {/* Action button */}
      <div style={{padding:"0 14px 14px"}}>
        <button onClick={e=>{e.stopPropagation();inStore?onRemove():onAdd();}} disabled={acting}
          style={{width:"100%",padding:"9px",borderRadius:10,fontWeight:700,fontSize:13,cursor:acting?"not-allowed":"pointer",transition:"all .15s",
            border:`1.5px solid ${inStore?"rgba(220,38,38,.3)":C.blue}`,
            background:inStore?"rgba(220,38,38,.06)":`${C.blue}10`,
            color:inStore?C.red:C.blue,opacity:acting?.5:1}}>
          {acting?"…":inStore?"✕ Remove":"+ Add to Store"}
        </button>
      </div>
    </div>
  );
}

// ── My Store Product Card ─────────────────────────────────────
function StoreCard({ sp, onView, onRemove, acting }:
  { sp:any; onView:()=>void; onRemove:()=>void; acting:boolean }) {
  const [hover,setHover]=useState(false);
  const hasImage=sp.productImage?.startsWith("http");
  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background:"#fff",border:`1px solid #e5e9f5`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",transform:hover?"translateY(-2px)":"none",boxShadow:hover?"0 8px 24px rgba(0,0,0,.1)":"none"}}>
      <div onClick={onView} style={{position:"relative",height:160,background:"#f3f4f6",overflow:"hidden"}}>
        {hasImage?(
          <img src={sp.productImage} alt={sp.productName} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .3s",transform:hover?"scale(1.05)":"scale(1)"}}/>
        ):(
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:56,background:"linear-gradient(135deg,#eff6ff,#f5f0ff)"}}>{sp.productImage||"📦"}</div>
        )}
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",opacity:hover?1:0,transition:"opacity .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"6px 14px",color:"#fff",fontWeight:700,fontSize:12}}>View / Edit</div>
        </div>
        <div style={{position:"absolute",top:10,left:10,background:sp.isVisible?`${C.green}`:"rgba(107,114,128,.8)",borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#fff"}}>
          {sp.isVisible?"● Visible":"● Hidden"}
        </div>
      </div>
      <div style={{padding:"12px 14px 10px"}} onClick={onView}>
        <div style={{fontWeight:700,fontSize:13,color:"#111827",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sp.productName}</div>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:10}}>{sp.vendorName}</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"monospace",fontWeight:900,fontSize:17,color:C.blue}}>${sp.retailPrice?.toFixed(2)}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>Cost ${sp.basePrice?.toFixed(2)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.green}}>+${sp.merchantProfit?.toFixed(2)}</div>
            <div style={{fontSize:9,color:"#9ca3af"}}>your profit</div>
          </div>
        </div>
      </div>
      <div style={{padding:"0 14px 14px"}}>
        <button onClick={e=>{e.stopPropagation();onRemove();}} disabled={acting}
          style={{width:"100%",padding:"8px",borderRadius:9,fontWeight:600,fontSize:12,cursor:acting?"not-allowed":"pointer",border:"1px solid rgba(220,38,38,.25)",background:"rgba(220,38,38,.06)",color:C.red,opacity:acting?.5:1}}>
          {acting?"…":"Remove from Store"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProductsPage(){
  const ctx=useMerchant();
  const params=useSearchParams();
  const [tab,setTab]=useState(params.get("tab")==="catalog"?"catalog":"mine");
  const [cat,setCat]=useState("All");
  const [search,setSearch]=useState("");
  const [viewing,setViewing]=useState<any>(null);
  const [acting,setActing]=useState<string|null>(null);

  const {items,loading:myLoad}=useStoreProducts(ctx.storeId);
  const {data:catalog,loading:catLoad}=useCatalog(cat);

  const hasIt=(pid:string)=>items.some((i:any)=>i.productId===pid);
  const getItem=(pid:string)=>items.find((i:any)=>i.productId===pid);

  const filteredCatalog=catalog.filter((p:any)=>
    !search||p.name?.toLowerCase().includes(search.toLowerCase())||p.vendorName?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(p:any){
    setActing(p.id);
    try{await addToStore(p,ctx.storeId,ctx.uid);toast.success(`"${p.name}" added to your store!`);}
    catch{toast.error("Failed to add.");}
    setActing(null);
  }
  async function handleRemove(sp:any){
    if(!confirm(`Remove "${sp.productName||sp.name}" from your store?`))return;
    setActing(sp.id||sp.productId);
    try{await removeFromStore(sp.id);toast.success("Removed.");}
    catch{toast.error("Failed.");}
    setActing(null);
  }

  // Build viewing context (is it a catalog item or store item?)
  const viewingStoreProduct = viewing ? getItem(viewing.id||viewing.productId) : null;
  const viewingInStore = viewing ? hasIt(viewing.id||viewing.productId) : false;

  return(<div>
    {/* Modal */}
    {viewing&&(
      <ProductModal
        p={viewing}
        inStore={viewingInStore}
        storeProduct={viewingStoreProduct}
        onAdd={()=>{handleAdd(viewing);setViewing(null);}}
        onRemove={()=>{handleRemove(viewingStoreProduct||viewing);setViewing(null);}}
        onClose={()=>setViewing(null)}
        acting={!!acting}/>
    )}

    <div className="fu" style={{marginBottom:18}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:12}}>Products</h1>
      {/* Tab switcher */}
      <div style={{display:"flex",background:"#f3f4f6",borderRadius:11,padding:4,marginBottom:16}}>
        {[{id:"mine",l:`My Store (${items.length})`},{id:"catalog",l:`Browse Catalog (${catalog.length})`}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#111827":"#9ca3af",boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,.08)":"none"}}>{t.l}</button>
        ))}
      </div>
    </div>

    {/* MY STORE TAB */}
    {tab==="mine"&&(
      myLoad?<div style={{textAlign:"center",padding:"60px 0",color:"#9ca3af"}}>Loading…</div>:
      items.length===0?(
        <div style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:16,padding:56,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:14}}>🏪</div>
          <div style={{fontWeight:800,fontSize:18,marginBottom:6,color:"#111827"}}>Your store is empty</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:20,lineHeight:1.6}}>Browse the catalog and add products you want to sell.<br/>You earn profit on every sale.</div>
          <button onClick={()=>setTab("catalog")} style={{background:`linear-gradient(135deg,${C.blue},${C.violet})`,color:"#fff",border:"none",borderRadius:11,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Browse Catalog →</button>
        </div>
      ):(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {[{l:"Total Products",v:items.length,c:C.blue},{l:"Visible",v:items.filter((i:any)=>i.isVisible).length,c:C.green},{l:"Hidden",v:items.filter((i:any)=>!i.isVisible).length,c:"#9ca3af"}].map(s=>(
              <div key={s.l} style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontWeight:800,fontSize:20,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
            {items.map((sp:any,i:number)=>(
              <StoreCard key={sp.id} sp={sp}
                onView={()=>{
                  // find catalog item for full details
                  const cat_item=catalog.find((c:any)=>c.id===sp.productId);
                  setViewing(cat_item||{id:sp.productId,name:sp.productName,images:[sp.productImage],basePrice:sp.basePrice,suggestedRetail:sp.retailPrice,vendorName:sp.vendorName,category:sp.category,description:"",tags:[]});
                }}
                onRemove={()=>handleRemove(sp)}
                acting={acting===sp.id}/>
            ))}
          </div>
        </div>
      )
    )}

    {/* CATALOG TAB */}
    {tab==="catalog"&&(
      <div>
        <div style={{marginBottom:14}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, vendors…"
            style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e5e9f5",borderRadius:11,fontSize:14,outline:"none",background:"#fff",marginBottom:10,boxSizing:"border-box" as const}}
            onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="#e5e9f5")}/>
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4}}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{padding:"5px 13px",borderRadius:99,flexShrink:0,border:`1.5px solid ${cat===c?C.blue:"#e5e9f5"}`,background:cat===c?`${C.blue}10`:"#fff",color:cat===c?C.blue:"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{c}</button>
            ))}
          </div>
        </div>
        {catLoad?(
          <div style={{textAlign:"center",padding:"60px 0",color:"#9ca3af"}}>Loading catalog…</div>
        ):filteredCatalog.length===0?(
          <div style={{background:"#fff",border:"1px solid #e5e9f5",borderRadius:16,padding:48,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>🔍</div>
            <div style={{fontWeight:700,fontSize:16,color:"#6b7280"}}>{search?"No products match your search":"No products in this category"}</div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
            {filteredCatalog.map((p:any,i:number)=>{
              const added=hasIt(p.id);
              const sp=getItem(p.id);
              return(
                <CatalogCard key={p.id} p={p} inStore={added} storeProduct={sp}
                  onView={()=>setViewing(p)}
                  onAdd={()=>handleAdd(p)}
                  onRemove={()=>handleRemove(sp!)}
                  acting={acting===p.id||acting===sp?.id}/>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>);
}
