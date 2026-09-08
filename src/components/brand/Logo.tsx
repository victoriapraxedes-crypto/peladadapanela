import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  /**
   * Mantida por compatibilidade. A arte oficial já inclui a placa charcoal,
   * então a marca é sempre renderizada com ela.
   */
  withBackground?: boolean;
  className?: string;
}

export function Logo({ size = 48, className }: LogoProps) {
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden align-middle", className)}
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
    >
      <img
        src="/logo-pelada.svg"
        width={size}
        height={size}
        alt="Pelada da Panela"
        className="block h-full w-full"
        draggable={false}
      />
    </span>
  );
}

export default Logo;
