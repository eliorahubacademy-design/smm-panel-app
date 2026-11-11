import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(`/${profile?.role ?? "customer"}/dashboard`);
  }

  const platforms = [
    { name: "Facebook", icon: "📘", color: "bg-blue-100 text-blue-800" },
    { name: "Instagram", icon: "📸", color: "bg-pink-100 text-pink-800" },
    { name: "TikTok", icon: "🎵", color: "bg-gray-100 text-gray-800" },
    { name: "LinkedIn", icon: "💼", color: "bg-blue-100 text-blue-900" },
    { name: "YouTube", icon: "▶️", color: "bg-red-100 text-red-800" },
    { name: "X (Twitter)", icon: "🐦", color: "bg-sky-100 text-sky-800" },
  ];

  const features = [
    { title: "Secure Wallet", desc: "Add funds via GCash or Maya. All transactions tracked.", icon: "💳" },
    { title: "Real-time Tracking", desc: "Monitor your orders with live status updates.", icon: "📊" },
    { title: "Reseller Program", desc: "Set custom pricing and build your own business.", icon: "🤝" },
    { title: "Authorized Services", desc: "Only platform-compliant promotion methods.", icon: "✅" },
    { title: "24/7 Support", desc: "Open a ticket anytime from your dashboard.", icon: "💬" },
    { title: "API Integration", desc: "Supplier API system for automated fulfillment.", icon: "⚡" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      {/* Navigation */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <span className="text-xl font-bold text-white">SMMPanel</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-gray-50 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 ring-1 ring-white/20">
            🇵🇭 &nbsp; Supporting GCash & Maya Payments
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Grow Your Social Media
            <span className="block text-brand-300"> With Authorized Services</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Professional social media marketing panel for businesses, creators, and resellers.
            All services use authorized advertising and platform-compliant fulfillment methods.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="rounded-xl bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow-lg hover:bg-gray-50 transition-colors">
              Start Growing Today
            </Link>
            <Link href="/login" className="rounded-xl bg-white/10 px-8 py-3 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white mb-10">Supported Platforms</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {platforms.map(p => (
              <div key={p.name} className="rounded-xl bg-white/10 p-4 text-center ring-1 ring-white/10 hover:bg-white/20 transition-colors">
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="text-sm font-medium text-white">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white mb-10">Everything You Need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="rounded-xl bg-white/10 p-6 ring-1 ring-white/10">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-sm text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/70 mb-8">Create your free account and place your first order in minutes.</p>
          <Link href="/register" className="rounded-xl bg-white px-8 py-3 text-base font-semibold text-brand-700 hover:bg-gray-50 transition-colors inline-block">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <p className="text-sm text-white/50">
          © 2024 SMMPanel. All services use authorized, platform-compliant promotion methods.
        </p>
      </footer>
    </div>
  );
}
