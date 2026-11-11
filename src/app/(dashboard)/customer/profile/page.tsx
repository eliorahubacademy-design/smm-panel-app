"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CustomerProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
      setProfile({ full_name: data?.full_name ?? "", email: user.email ?? "", role: data?.role ?? "customer" });
      setFullName(data?.full_name ?? "");
      setLoading(false);
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    if (error) setMsg({ type: "error", text: error.message });
    else { setMsg({ type: "success", text: "Profile updated!" }); setProfile(p => p ? { ...p, full_name: fullName } : p); }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMsg({ type: "error", text: "Passwords do not match" }); return; }
    if (newPassword.length < 8) { setMsg({ type: "error", text: "Password must be at least 8 characters" }); return; }
    setSaving(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMsg({ type: "error", text: error.message });
    else { setMsg({ type: "success", text: "Password changed!" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      )}

      {/* Account Info */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold">Account Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Email</p><p className="font-medium">{profile?.email}</p></div>
          <div><p className="text-gray-500">Role</p><p className="font-medium capitalize">{profile?.role}</p></div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save Changes"}</button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Updating…" : "Change Password"}</button>
        </form>
      </div>
    </div>
  );
}
