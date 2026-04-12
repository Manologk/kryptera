import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  centered?: boolean;
}

export default function Layout({ children, maxWidth = 480, centered = true }: LayoutProps) {
  return (
    <main style={{
      flex: 1,
      maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
      width: '100%',
      margin: centered ? '0 auto' : undefined,
      padding: '48px clamp(16px, 5vw, 32px) 88px',
    }}>
      {children}
    </main>
  );
}

// ── Page Header ────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', marginBottom: 28,
    }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
