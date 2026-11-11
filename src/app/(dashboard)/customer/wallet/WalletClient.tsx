"use client";

import { useState } from "react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/cn";
import type { Wallet, WalletTransaction, PaymentRecord } from "@/types";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface WalletClientProps {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  payments: PaymentRecord[];
}

const paymentMethods = [
  { value: "gcash", label: "GCash", icon: "💚", accountInfo: "GCash Number: 09XX-XXX-XXXX" },
  { value: "maya", label: "Maya", icon: "💙", accountInfo: "Maya Number: 09XX-XXX-XXXX" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦", accountInfo: "BDO: 1234-5678-9012" },
];

export default function WalletClient({ wallet, transactions, payments }: WalletClientProps) {
  const router = useRouter();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    payment_method: "gcash",
    reference_number: "",
    sender_name: "",
    sender_account: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "deposits">("transactions");

  const selectedMethod = paymentMethods.find(m => m.value === form.payment_method);

  async function handleSubmitDeposit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amount = Number(form.amount);
    if (isNaN(amount) || amount < 50) {
      setError("Minimum deposit amount is ₱50.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to submit deposit.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setShowAddFunds(false);
        setSuccess(false);
        setForm({ amount: "", payment_method: "gcash", reference_number: "", sender_name: "", sender_account: "" });
        router.refresh();
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="page-subtitle">Manage your funds and transaction history</p>
        </div>
        <button onClick={() => setShowAddFunds(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Funds
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0">
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon className="h-4 w-4 opacity-80" />
            <span className="text-sm opacity-80">Available Balance</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(wallet?.balance ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Deposited</p>
          <p className="text-xl font-semibold text-green-600 mt-1">{formatCurrency(wallet?.total_deposited ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-xl font-semibold text-red-600 mt-1">{formatCurrency(wallet?.total_spent ?? 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Refunded</p>
          <p className="text-xl font-semibold text-purple-600 mt-1">{formatCurrency(wallet?.total_refunded ?? 0)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: "transactions", label: "Transaction History" },
            { key: "deposits", label: "Deposit Requests" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Transactions Table */}
      {activeTab === "transactions" && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-th">Type</th>
                <th className="table-th">Description</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Balance After</th>
                <th className="table-th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!transactions.length ? (
                <tr><td colSpan={5} className="table-td text-center text-gray-500 py-10">No transactions yet.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="table-tr">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {tx.amount > 0
                          ? <ArrowDownLeft className="h-4 w-4 text-green-500" />
                          : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                        <span className="capitalize text-sm">{tx.type}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500 text-sm">{tx.description ?? "—"}</td>
                    <td className={`table-td font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                    <td className="table-td">{formatCurrency(tx.balance_after)}</td>
                    <td className="table-td text-gray-500 text-xs">{formatDate(tx.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Deposits Table */}
      {activeTab === "deposits" && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-th">Reference</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Method</th>
                <th className="table-th">Status</th>
                <th className="table-th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!payments.length ? (
                <tr><td colSpan={5} className="table-td text-center text-gray-500 py-10">No deposit requests yet.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="table-tr">
                    <td className="table-td font-mono text-xs">{p.reference_number}</td>
                    <td className="table-td font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                    <td className="table-td capitalize">{p.payment_method.replace("_", " ")}</td>
                    <td className="table-td"><span className={`badge ${getStatusColor(p.status)}`}>{p.status}</span></td>
                    <td className="table-td text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Funds Modal */}
      {showAddFunds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Add Funds</h2>
              <button onClick={() => setShowAddFunds(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="p-6 space-y-4">
              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  ✅ Deposit request submitted! Admin will verify and credit your wallet.
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, payment_method: m.value }))}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        form.payment_method === m.value
                          ? "border-brand-500 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-xl mb-1">{m.icon}</div>
                      <div className="text-xs font-medium">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                  <p className="font-medium mb-1">Send payment to:</p>
                  <p className="font-mono">{selectedMethod.accountInfo}</p>
                  <p className="mt-1 text-xs text-gray-500">Account name: SMMPanel Services</p>
                </div>
              )}

              <div>
                <label className="label">Amount (PHP) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  placeholder="e.g. 500"
                  min="50"
                  step="50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Minimum deposit: ₱50</p>
              </div>

              <div>
                <label className="label">Payment Reference Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reference_number}
                  onChange={e => setForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="input"
                  placeholder="e.g. GCash ref: 2024XXXXXXXX"
                  required
                />
              </div>

              <div>
                <label className="label">Sender Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.sender_name}
                  onChange={e => setForm(prev => ({ ...prev, sender_name: e.target.value }))}
                  className="input"
                  placeholder="Name on sending account"
                  required
                />
              </div>

              <div>
                <label className="label">Sender Account Number</label>
                <input
                  type="text"
                  value={form.sender_account}
                  onChange={e => setForm(prev => ({ ...prev, sender_account: e.target.value }))}
                  className="input"
                  placeholder="GCash/Maya number or bank account"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddFunds(false)} className="btn-secondary flex-1" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting || success} className="btn-primary flex-1">
                  {submitting ? "Submitting..." : "Submit Deposit Request"}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Your balance will be credited after admin verification, typically within 1-3 hours.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
