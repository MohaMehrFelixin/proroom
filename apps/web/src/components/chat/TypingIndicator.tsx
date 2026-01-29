interface TypingIndicatorProps {
  names: string[];
}

export const TypingIndicator = ({ names }: TypingIndicatorProps) => {
  if (names.length === 0) return null;

  const text =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-tg-text-secondary" />
        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-tg-text-secondary [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-tg-text-secondary [animation-delay:0.4s]" />
      </div>
      <span className="text-xs text-tg-text-secondary">{text}</span>
    </div>
  );
};
