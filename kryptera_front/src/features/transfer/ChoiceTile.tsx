import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChoiceTileProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
  name?: string;
}

export default function ChoiceTile({
  selected,
  onSelect,
  title,
  description,
  icon,
  name,
}: ChoiceTileProps) {
  return (
    <button
      type="button"
      name={name}
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/35'
          : 'border-border bg-card hover:border-primary/45 hover:bg-muted/40',
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-background',
          )}
          aria-hidden
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-primary-foreground" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
            <p className="font-semibold leading-snug text-foreground">{title}</p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}
