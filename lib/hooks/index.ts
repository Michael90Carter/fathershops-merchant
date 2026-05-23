// lib/hooks/index.ts
"use client";
import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase/client";

function useLive<T>(col: string, constraints: QueryConstraint[] = [], deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, col), ...constraints);
    const unsub = onSnapshot(q, s => {
      setData(s.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

export function useMerchantStore(merchantId: string | null) {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!merchantId) { setLoading(false); return; }
    const q = query(collection(db, "stores"), where("merchantId", "==", merchantId), limit(1));
    return onSnapshot(q, s => {
      setStore(s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() });
      setLoading(false);
    });
  }, [merchantId]);
  return { store, loading };
}

export function useCatalog(category?: string) {
  // Fetch all active products - filter category client-side to avoid composite index
  const c: QueryConstraint[] = [orderBy("createdAt", "desc")];
  const result = useLive<any>("products", c, []);
  // Filter client-side by status and category
  const filtered = {
    data: result.data.filter((p: any) => {
      const statusOk = !p.status || p.status === "active";
      const catOk = !category || category === "All" || p.category === category;
      return statusOk && catOk;
    }),
    loading: result.loading,
  };
  return filtered;
}

export function useStoreProducts(storeId: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    return onSnapshot(query(collection(db, "store_products"),
      where("storeId", "==", storeId), orderBy("addedAt", "desc")), s => {
      setItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [storeId]);
  return { items, loading };
}

export async function addToStore(p: any, storeId: string, merchantId: string, retail?: number) {
  const r = retail ?? p.suggestedRetail;
  return addDoc(collection(db, "store_products"), {
    storeId, merchantId, productId: p.id, productName: p.name,
    productImage: p.images?.[0] ?? "📦", vendorId: p.vendorId,
    vendorName: p.vendorName, category: p.category,
    basePrice: p.basePrice, retailPrice: r,
    merchantProfit: +(r * 0.20).toFixed(2),
    isVisible: true, addedAt: serverTimestamp(),
  });
}
export async function removeFromStore(id: string) { await deleteDoc(doc(db, "store_products", id)); }
export async function updateRetailPrice(id: string, retailPrice: number) {
  await updateDoc(doc(db, "store_products", id), { retailPrice, merchantProfit: +(retailPrice * 0.20).toFixed(2) });
}
export async function toggleVisibility(id: string, current: boolean) {
  await updateDoc(doc(db, "store_products", id), { isVisible: !current });
}

export function useOrders(merchantId: string | null, status?: string) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!merchantId) { setLoading(false); return; }
    const c: QueryConstraint[] = [where("merchantId", "==", merchantId), orderBy("placedAt", "desc")];
    if (status && status !== "All") c.splice(1, 0, where("status", "==", status));
    return onSnapshot(query(collection(db, "orders"), ...c), s => {
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [merchantId, status]);
  return { orders, loading };
}

export async function updateOrderStatus(id: string, status: string, tracking?: string) {
  const up: any = { status, updatedAt: serverTimestamp() };
  if (tracking) up.trackingNumber = tracking;
  await updateDoc(doc(db, "orders", id), up);
}

export function useWallet(merchantId: string | null) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!merchantId) { setLoading(false); return; }
    return onSnapshot(query(collection(db, "wallets"), where("merchantId", "==", merchantId), limit(1)), s => {
      setWallet(s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() });
      setLoading(false);
    });
  }, [merchantId]);
  return { wallet, loading };
}

export function useDepositAddresses(merchantId: string | null) {
  const [addrs, setAddrs] = useState<any[]>([]);
  useEffect(() => {
    if (!merchantId) return;
    return onSnapshot(query(collection(db, "deposit_addresses"),
      where("merchantId", "==", merchantId), where("isActive", "==", true)), s => {
      setAddrs(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [merchantId]);
  return { addrs };
}

export function useTransactions(merchantId: string | null) {
  const [txns, setTxns] = useState<any[]>([]);
  useEffect(() => {
    if (!merchantId) return;
    return onSnapshot(query(collection(db, "transactions"),
      where("merchantId", "==", merchantId), orderBy("createdAt", "desc"), limit(50)), s => {
      setTxns(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [merchantId]);
  return { txns };
}

export function useWithdrawals(merchantId: string | null) {
  const [wds, setWds] = useState<any[]>([]);
  useEffect(() => {
    if (!merchantId) return;
    return onSnapshot(query(collection(db, "withdrawals"),
      where("merchantId", "==", merchantId), orderBy("requestedAt", "desc")), s => {
      setWds(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [merchantId]);
  return { wds };
}

export async function requestWithdrawal(data: any) {
  return addDoc(collection(db, "withdrawals"), { ...data, status: "pending", requestedAt: serverTimestamp() });
}

// ── KYC ──────────────────────────────────────────────────
export async function submitKYC(data: any) {
  return addDoc(collection(db, "kyc_submissions"), {
    ...data, status: "pending", submittedAt: serverTimestamp(),
  });
}
export function useMerchantKYC(merchantId: string | null) {
  const [kyc, setKyc] = useState<any>(null);
  useEffect(() => {
    if (!merchantId) return;
    return onSnapshot(query(collection(db, "kyc_submissions"),
      where("merchantId", "==", merchantId), orderBy("submittedAt", "desc"), limit(1)), s => {
      setKyc(s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() });
    });
  }, [merchantId]);
  return { kyc };
}

// ── Chat ──────────────────────────────────────────────────
export function useMerchantChatRoom(merchantId: string | null) {
  const [room, setRoom] = useState<any>(null);
  useEffect(() => {
    if (!merchantId) return;
    return onSnapshot(query(collection(db, "chat_rooms"),
      where("merchantId", "==", merchantId), limit(1)), s => {
      setRoom(s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() });
    });
  }, [merchantId]);
  return { room };
}

export function useChatMessages(roomId: string | null) {
  const [msgs, setMsgs] = useState<any[]>([]);
  useEffect(() => {
    if (!roomId) { setMsgs([]); return; }
    const q = query(collection(db, `chat_rooms/${roomId}/messages`), orderBy("createdAt", "asc"));
    return onSnapshot(q, s => {
      setMsgs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      updateDoc(doc(db, "chat_rooms", roomId), { unreadMerchant: 0 });
    });
  }, [roomId]);
  return { msgs };
}

export async function sendMerchantMessage(roomId: string, text: string, merchant: any, store: any, unreadAdmin: number) {
  let rId = roomId;
  if (!rId) {
    const ref = await addDoc(collection(db, "chat_rooms"), {
      merchantId: merchant.uid, merchantName: merchant.name,
      merchantEmail: merchant.email, storeId: store?.id ?? "",
      storeName: store?.storeName ?? "", lastMessage: text,
      lastMessageAt: serverTimestamp(), lastMessageBy: "merchant",
      unreadAdmin: 1, unreadMerchant: 0, createdAt: serverTimestamp(),
    });
    rId = ref.id;
  } else {
    await updateDoc(doc(db, "chat_rooms", rId), {
      lastMessage: text, lastMessageAt: serverTimestamp(),
      lastMessageBy: "merchant", unreadAdmin: unreadAdmin + 1,
    });
  }
  await addDoc(collection(db, `chat_rooms/${rId}/messages`), {
    senderId: merchant.uid, senderName: merchant.name,
    senderRole: "merchant", text, read: false, createdAt: serverTimestamp(),
  });
  return rId;
}

// ── Notifications ──────────────────────────────────────────
export function useNotifications(userId: string | null) {
  const [notifs, setNotifs] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    return onSnapshot(query(collection(db, "notifications"),
      where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20)), s => {
      setNotifs(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);
  const unread = notifs.filter(n => !n.read).length;
  const markRead = (id: string) => updateDoc(doc(db, "notifications", id), { read: true });
  return { notifs, unread, markRead };
}
