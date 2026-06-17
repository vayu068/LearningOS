import React, { useState } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

export interface MainLayoutProps {
  children: React.ReactNode;
  tenantName?: string;
  tenantLogo?: string;
  navItems?: NavItem[];
  breadcrumbs?: { label: string; href?: string }[];
  userRole?: "student" | "teacher" | "admin" | "governance";
  userName?: string;
  onLogout?: () => void;
  onLanguageChange?: (lang: string) => void;
  currentLanguage?: string;
}

export function MainLayout({
  children,
  tenantName = "LearningOS",
  navItems = [],
  breadcrumbs = [],
  userRole = "student",
  userName = "User",
  onLogout,
  onLanguageChange,
  currentLanguage = "en",
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleColors = {
    student: "bg-blue-600",
    teacher: "bg-green-600",
    admin: "bg-purple-600",
    governance: "bg-amber-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`h-16 flex items-center px-6 ${roleColors[userRole]}`}>
          <h1 className="text-white font-bold text-lg truncate">{tenantName}</h1>
        </div>
        <nav className="mt-4 px-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                item.active
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="hidden sm:flex items-center space-x-2 text-sm">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-2 text-gray-400">/</span>}
                    {crumb.href ? (
                      <a href={crumb.href} className="text-primary-600 hover:underline">
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-gray-500">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Language selector */}
            {onLanguageChange && (
              <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
                <option value="mr">Marathi</option>
                <option value="kn">Kannada</option>
              </select>
            )}
            {/* User info */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${roleColors[userRole]} flex items-center justify-center`}>
                <span className="text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">{userName}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
