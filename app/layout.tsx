// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
export const metadata: Metadata = { title:"ShopGrid — Merchant", description:"Your dropshipping store" };
export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="en"><body>{children}
      <Toaster position="top-center" toastOptions={{ duration:3500,
        style:{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600} }}/>
    </body></html>
  );
}
