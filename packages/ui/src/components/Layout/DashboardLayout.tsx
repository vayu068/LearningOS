import React from "react";

export interface DashboardWidget {
  id: string;
  title: string;
  content: React.ReactNode;
  span?: 1 | 2 | 3 | 4;
}

export interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  widgets?: DashboardWidget[];
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DashboardLayout({
  title,
  subtitle,
  widgets = [],
  filters,
  actions,
  children,
}: DashboardLayoutProps) {
  const spanClasses: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-2 lg:col-span-3",
    4: "col-span-1 md:col-span-2 lg:col-span-4",
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Filters */}
      {filters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {filters}
        </div>
      )}

      {/* Widget grid */}
      {widgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${
                spanClasses[widget.span || 1]
              }`}
            >
              <h3 className="text-sm font-medium text-gray-500 mb-2">{widget.title}</h3>
              <div>{widget.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Additional content */}
      {children}
    </div>
  );
}
