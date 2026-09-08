import { cn } from "@/lib/utils";
import { initials } from "@/lib/format/players";

interface InitialsAvatarProps {
  apelido: string;
  size?: number;
  className?: string;
}

export function InitialsAvatar({ apelido, size = 36, className }: InitialsAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display font-semibold text-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(apelido)}
    </span>
  );
}
