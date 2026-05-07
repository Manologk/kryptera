import * as React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  subtle?: boolean;
  elevated?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, subtle, elevated, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow',
        subtle && 'border-transparent bg-muted/40 shadow-none',
        elevated && 'shadow-md',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-7', className)} {...props}>
      {title != null ? <CardTitle>{title}</CardTitle> : null}
      {subtitle != null ? <CardDescription>{subtitle}</CardDescription> : null}
      {children}
    </div>
  ),
);
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-7 pt-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-7 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

function CardDivider({ className }: { className?: string }) {
  return (
    <div className={cn('px-7', className)}>
      <Separator />
    </div>
  );
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardDivider };
export default Card;
