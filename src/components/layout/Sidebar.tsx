"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/types";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  MessageSquare,
  User,
  LogOut,
  Settings,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Truck,
  FileText,
  Tag,
  ListOrdered,
} from "lucide-react";

interface SidebarProps {
  profile: Profile;
}

const customerLinks = [
  { href: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customer/services", label: "Browse Services", icon: Package },
  { href: "/customer/orders", label: "My Orders", icon: ShoppingCart },
  { href: "/customer/wallet", label: "Wallet", icon: Wallet },
  { href: "/customer/tickets", label: "Support Tickets", icon: MessageSquare },
  { href: "/customer/profile", label: "My Profile", icon: User },
];

const resellerLinks = [
  { href: "/reseller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reseller/services", label: "Services", icon: Package },
  { href: "/reseller/pricing", label: "My Pricing", icon: Tag },
  { href: "/reseller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/reseller/reports", label: "Sales Reports", icon: BarChart3 },
  { href: "/customer/wallet", label: "Wallet", icon: Wallet },
  { href: "/customer/tickets", label: "Support", icon: MessageSquare },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/services", label: "Services", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ListOrdered },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links =
    profile.role === "admin"
      ? adminLinks
      : profile.role === "reseller"
      ? resellerLinks
      : customerLinks;

  const roleLabel =
    profile.role === "admin"
      ? "Administrator"
      : profile.role === "reseller"
      ? "Reseller"
      : "Customer";

  const roleBadgeColor =
    profile.role === "admin"
      ? "bg-purple-100 text-purple-800"
      : profile.role === "reseller"
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <span className="text-2xl">📱</span>
        <span className="text-lg font-bold text-gray-900">SMMPanel</span>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
            {(profile.full_name ?? profile.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile.full_name ?? "User"}
            </p>
            <span className={cn("badge text-xs", roleBadgeColor)}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={isActive ? "sidebar-link-active" : "sidebar-link"}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
