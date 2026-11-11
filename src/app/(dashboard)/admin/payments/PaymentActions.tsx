"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"verify" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function handleVerify() {
    setLoading("verify");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/verify`, { method: "POST" });
      if (res.ok) router.refresh();
      else {
        const { error } = await res.json();
        alert(error ?? "Failed to verify");
      }
    } finally { setLoading(null); }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { alert("Please enter a rejection reason"); return; }
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) { setShowReject(false); router.refresh(); }
      else {
        const { error } = await res.json();
        alert(error ?? "Failed to reject");
      }
    } finally { setLoading(null); }
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-1 min-w-48">
        <input
          type="text"
          placeholder="Rejection reason..."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          className="input text-xs py-1"
        />
        <div className="flex gap-1">
          <button onClick={handleReject} disabled={!!loading} className="btn-danger text-xs px-2 py-1 flex-1">
            {loading === "reject" ? "..." : "Confirm"}
          </button>
          <button onClick={() => setShowReject(false)} className="btn-secondary text-xs px-2 py-1 flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleVerify}
        disabled={!!loading}
        className="bg-green-50 text-green-700 hover:bg-green-100 text-xs px-3 py-1 rounded-md font-medium"
      >
        {loading === "verify" ? "..." : "Verify"}
      </button>
      <button
        onClick={() => setShowReject(true)}
        className="bg-red-50 text-red-700 hover:bg-red-100 text-xs px-3 py-1 rounded-md font-medium"
      >
        Reject
      </button>
    </div>
  );
}
