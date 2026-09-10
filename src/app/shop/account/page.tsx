'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Award,
  Package,
  Wrench,
  LogOut,
  ShoppingBag,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

type Shopper = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  loyalty?: {
    points: number;
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
    totalSpent: number;
  } | null;
};

type OrderRecord = {
  id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus?: string;
  createdAt: string;
};

type RepairRecord = {
  id: string;
  jobNumber: string;
  deviceModel: string;
  primaryFault: string | null;
  status: string;
  serviceCharge: number;
  partsAmount: number;
  createdAt: string;
};

export default function ShopAccountPage() {
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'REPAIRS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, []);

  async function fetchAccountData() {
    try {
      const res = await fetch('/api/auth/shopper');
      const data = await res.json();
      if (data.authenticated && data.customer) {
        setShopper(data.customer);
        setOrders(data.orders || []);
        setRepairs(data.repairs || []);
        setEditName(data.customer.name || '');
        setEditPhone(data.customer.phone || '');
        setEditAddress(data.customer.address || '');
      } else {
        setShopper(null);
      }
    } catch {
      setShopper(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/shopper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || undefined,
          phone: editPhone.trim() || undefined,
          address: editAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setProfileMsg('Profile updated successfully.');
      setIsEditingProfile(false);
      await fetchAccountData();
    } catch (err: unknown) {
      setProfileMsg((err as Error).message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/shopper', { method: 'DELETE' });
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Loading your account...</span>
        </div>
      </div>
    );
  }

  if (!shopper) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200 px-4">
        <div className="max-w-md w-full rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
            <User className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign in to your account</h1>
          <p className="text-xs text-zinc-400">
            Sign in to access your order tracking, warranty certificates, repair tickets, and loyalty rewards.
          </p>
          <div className="pt-2">
            <Link
              href="/shop/login?next=/shop/account"
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-glow-em"
            >
              Sign In / Register
            </Link>
          </div>
          <p className="text-xs text-zinc-500 pt-2">
            <Link href="/" className="hover:underline">
              ← Return to store
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={false} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Continue Shopping
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Customer Profile Banner */}
        <div className="rounded-3xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-zinc-950 text-xl font-black shadow-glow-em">
                {shopper.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{shopper.name}</h1>
                  {shopper.loyalty?.tier && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {shopper.loyalty.tier} Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{shopper.email || 'Verified Shopper Account'}</p>
              </div>
            </div>

            {/* Loyalty Quick Stats */}
            <div className="flex items-center gap-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Rewards Points</span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {shopper.loyalty?.points ?? 0} <span className="text-xs font-sans font-medium text-zinc-400">pts</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ORDERS'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REPAIRS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'REPAIRS'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Repairs & Service ({repairs.length})</span>
          </button>
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" /> Personal Information
                </h2>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider block">Full Name</span>
                    <p className="font-semibold text-zinc-200 text-sm mt-0.5">{shopper.name}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider block">Mobile Number</span>
                    <p className="font-semibold text-zinc-200 mt-0.5">{shopper.phone || '— (Add for order SMS)'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider block">Email Address</span>
                    <p className="font-semibold text-zinc-200 mt-0.5">{shopper.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider block">Delivery Address</span>
                    <p className="font-semibold text-zinc-200 mt-0.5">{shopper.address || '— (No address saved yet)'}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Default Delivery Address</label>
                    <textarea
                      rows={2}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Street, City..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 font-semibold text-xs hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {profileMsg && (
                <p className="text-xs font-semibold text-emerald-400 pt-1">{profileMsg}</p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Award className="h-4 w-4 text-amber-400" /> Loyalty & Membership Privileges
              </h2>
              <div className="space-y-3 text-xs text-zinc-400">
                <p>
                  Earn 1 loyalty point for every <strong className="text-white">LKR 100</strong> spent across our physical stores and online storefront.
                </p>
                <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tier Status</span>
                    <span className="font-bold text-amber-400">{shopper.loyalty?.tier || 'SILVER'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Redemption Value</span>
                    <span className="font-bold text-zinc-200">1 pt = LKR 1.00 Discount</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Lifetime Spend</span>
                    <span className="font-bold text-emerald-400">LKR {(shopper.loyalty?.totalSpent ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
                <Package className="h-10 w-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No orders placed yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Browse our catalog and place your first order with fast home delivery.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Start Shopping
                </Link>
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{o.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.status === 'DELIVERED' || o.status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : o.status === 'CANCELLED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {o.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Placed on {new Date(o.createdAt).toLocaleDateString()} · Payment: {o.paymentStatus} · Status: {o.status}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      LKR {o.grandTotal.toLocaleString()}
                    </span>
                    <Link
                      href={`/track/${o.orderNumber}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                    >
                      <span>Track Order</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: REPAIRS */}
        {activeTab === 'REPAIRS' && (
          <div className="space-y-3">
            {repairs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
                <Wrench className="h-10 w-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No active repair tickets</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Need your phone, laptop, or device inspected? Book an appointment or request an estimate.
                </p>
                <Link
                  href="/shop/repairs/book"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors"
                >
                  <Wrench className="h-3.5 w-3.5" /> Book a Device Repair
                </Link>
              </div>
            ) : (
              repairs.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">{r.jobNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200 mt-1">{r.deviceModel}</p>
                    {r.primaryFault && <p className="text-[11px] text-zinc-400">{r.primaryFault}</p>}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                    <span className="text-xs font-mono text-zinc-400">
                      Estimate: LKR {(r.serviceCharge + r.partsAmount).toLocaleString()}
                    </span>
                    <Link
                      href={`/shop/repairs/track?job=${r.jobNumber}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                    >
                      <span>Track Job</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
