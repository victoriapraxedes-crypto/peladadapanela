import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  /**
   * Mantida por compatibilidade. A arte oficial já inclui a placa charcoal,
   * então a marca é sempre renderizada com ela.
   */
  withBackground?: boolean;
  className?: string;
  /** Amplia a arte dentro da mesma caixa; o excesso é recortado. */
  zoom?: number;
}

export function Logo({ size = 48, className, zoom = 1 }: LogoProps) {
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
        style={zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: "center" } : undefined}
        draggable={false}
      />
    </span>
  );
}

export default Logo;
