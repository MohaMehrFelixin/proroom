const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
};

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full bg-tg-bg-input/80 px-3 py-1 text-[11px] font-medium text-tg-text-secondary">
        {formatDate(date)}
      </span>
    </div>
  );
};
