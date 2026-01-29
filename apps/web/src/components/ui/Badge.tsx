import { cn } from '@/lib/cn';

interface BadgeProps {
  count: number;
  className?: string;
}

export const Badge = ({ count, className }: BadgeProps) => {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <span
      className={cn(
        'inline-flex min-w-[20px] items-center justify-center rounded-full bg-tg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-white',
        className,
      )}
    >
      {display}
    </span>
  );
};
