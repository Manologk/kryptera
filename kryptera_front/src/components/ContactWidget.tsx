import { useState } from 'react';
import { CONTACT_INFO } from '@/constants';

interface ContactLink {
  icon: string;
  label: string;
  href: string;
  hint: string;
}

const links: ContactLink[] = [
  { icon: '✉', label: 'Email',     href: `mailto:${CONTACT_INFO.email}`,          hint: CONTACT_INFO.email },
  { icon: '📞', label: 'Phone',    href: `tel:${CONTACT_INFO.phone}`,              hint: CONTACT_INFO.phone },
  { icon: '💬', label: 'WhatsApp', href: `https://wa.me/${CONTACT_INFO.whatsapp}`, hint: 'Chat on WhatsApp' },
  { icon: '✈', label: 'Telegram',  href: `https://t.me/${CONTACT_INFO.telegram}`,  hint: CONTACT_INFO.telegram },
];

export default function ContactWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>
      {/* Popup */}
      {open && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 0 8px',
            marginBottom: 12,
            width: 240,
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeUp 0.2s ease',
          }}
        >
          <div style={{ padding: '0 20px 12px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14 }}>Support</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Available 24/7
            </p>
          </div>

          {links.map(({ icon, label, href, hint }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px',
                color: 'var(--color-text)', textDecoration: 'none',
                transition: 'background 150ms ease',
                fontSize: 14,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{hint}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close support' : 'Open support'}
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: open ? 'var(--color-text)' : 'var(--color-primary)',
          color: open ? '#fff' : 'var(--color-text)',
          fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(159,232,112,0.5)',
          cursor: 'pointer', transition: 'all 200ms ease',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
