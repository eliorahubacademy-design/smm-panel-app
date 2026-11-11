"use client";

import { useState } from "react";
import { formatCurrency, getPlatformColor, getStatusColor } from "@/lib/utils/cn";
import type { Platform, Service } from "@/types";
import { Search, ShoppingCart, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface ServicesClientProps {
  platforms: Platform[];
  services: Service[];
  walletBalance: number;
  userId: string;
}

export default function ServicesClient({ platforms, services, walletBalance, userId }: ServicesClientProps) {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(1000);
  const [targetUrl, setTargetUrl] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  const filtered = services.filter(s => {
    const matchesPlatform = selectedPlatform === "all" || s.platform_id === selectedPlatform;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const totalPrice = selectedService ? (selectedService.base_price * quantity) : 0;

  async function handlePlaceOrder() {
    if (!selectedService) return;
    setOrderError("");
    setOrdering(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedService.id,
          target_url: targetUrl,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.error ?? "Failed to place order");
        return;
      }

      setOrderSuccess(true);
      setTimeout(() => {
        setSelectedService(null);
        setOrderSuccess(false);
        setTargetUrl("");
        setQuantity(1000);
        router.refresh();
      }, 2000);
    } catch {
      setOrderError("Network error. Please try again.");
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Browse Services</h1>
          <p className="page-subtitle">
            Wallet Balance: <span className="text-green-600 font-semibold">{formatCurrency(walletBalance)}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedPlatform("all")}
          className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            selectedPlatform === "all"
              ? "bg-brand-600 text-white"
              : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          All Platforms
        </button>
        {platforms.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlatform(p.id)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPlatform === p.id
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No services found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(service => (
            <div
              key={service.id}
              className="card hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-brand-200"
              onClick={() => {
                setSelectedService(service);
                setQuantity(service.min_quantity);
                setOrderError("");
                setOrderSuccess(false);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`badge text-xs mb-2 ${getPlatformColor(service.platform?.slug ?? "")} text-white`}>
                    {service.platform?.name}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{service.name}</h3>
                </div>
              </div>

              {service.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{service.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">Price per 1k</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(service.base_price * 1000)}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">Min Qty</p>
                  <p className="font-semibold text-gray-900">{service.min_quantity.toLocaleString()}</p>
                </div>
                {service.average_speed && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">Speed</p>
                    <p className="font-semibold text-gray-900">{service.average_speed}</p>
                  </div>
                )}
                {service.estimated_days && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">Est. Days</p>
                    <p className="font-semibold text-gray-900">{service.estimated_days}d</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 capitalize">{service.category}</span>
                <button className="text-brand-600 text-xs font-medium hover:text-brand-700 flex items-center gap-1">
                  Order Now <ShoppingCart className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Place Order</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedService.name}</p>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {orderSuccess && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center">
                  ✅ Order placed successfully! Redirecting...
                </div>
              )}
              {orderError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {orderError}
                </div>
              )}

              <div className="rounded-xl bg-brand-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform</span>
                  <span className="font-medium">{selectedService.platform?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium truncate ml-4 text-right">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per {selectedService.unit}</span>
                  <span className="font-medium">{formatCurrency(selectedService.base_price)}</span>
                </div>
              </div>

              <div>
                <label className="label">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    className="input pr-9"
                    placeholder="https://www.instagram.com/yourhandle"
                    required
                  />
                  <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="label">
                  Quantity ({selectedService.unit})
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  min={selectedService.min_quantity}
                  max={selectedService.max_quantity}
                  step={100}
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Min: {selectedService.min_quantity.toLocaleString()} · Max: {selectedService.max_quantity.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Price</span>
                  <span className="text-xl font-bold text-brand-700">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Wallet Balance</span>
                  <span className={walletBalance >= totalPrice ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>

              {walletBalance < totalPrice && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  ⚠️ Insufficient balance.{" "}
                  <a href="/customer/wallet" className="font-medium underline">Add funds</a>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedService(null)}
                  className="btn-secondary flex-1"
                  disabled={ordering}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={ordering || walletBalance < totalPrice || !targetUrl || orderSuccess}
                  className="btn-primary flex-1"
                >
                  {ordering ? "Placing..." : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
