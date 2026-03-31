"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const dashboardLinks = [
  { href: "/dashboard", label: "Scan" },
  { href: "/dashboard/sites", label: "My Sites" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/tools", label: "Tools" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Dashboard sub-navigation */}
      <nav className="border-b border-border bg-bg-secondary" aria-label="Dashboard navigation">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto">
            {dashboardLinks.map((link) => {
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 border-b-2 px-4 py-3 text-body-sm transition-colors ${
                    isActive
                      ? "border-text-primary text-text-primary font-medium"
                      : "border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-hover"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}
