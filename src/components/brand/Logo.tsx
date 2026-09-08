interface LogoProps {
  size?: number;
  withBackground?: boolean;
  className?: string;
}

const CELLS: { x: number; y: number; orange: boolean }[] = [
  { x: -99, y: -57.16, orange: false },
  { x: -99, y: 0, orange: false },
  { x: -99, y: 57.16, orange: false },
  { x: -49.5, y: -85.74, orange: false },
  { x: -49.5, y: -28.58, orange: false },
  { x: -49.5, y: 28.58, orange: false },
  { x: -49.5, y: 85.74, orange: false },
  { x: 0, y: -57.16, orange: false },
  { x: 0, y: 0, orange: false },
  { x: 0, y: 57.16, orange: false },
  { x: 49.5, y: -85.74, orange: false },
  { x: 49.5, y: 85.74, orange: false },
  { x: 49.5, y: -28.58, orange: true },
  { x: 49.5, y: 28.58, orange: true },
  { x: 99, y: -57.16, orange: true },
  { x: 99, y: 0, orange: true },
  { x: 99, y: 57.16, orange: true },
];

const HEX = "26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52";
const OFF_WHITE = "#F5F2EB";
const ORANGE = "#FF7A2F";

export function Logo({ size = 48, withBackground = false, className }: LogoProps) {
  const clipId = `ppBall-${withBackground ? "bg" : "plain"}-${size}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      role="img"
      aria-label="Pelada da Panela"
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r="100" />
        </clipPath>
      </defs>
      {withBackground && <rect width="256" height="256" rx="56" fill="#111111" />}
      <g transform="translate(108 128) scale(0.72)">
        <line
          x1="86"
          y1="4"
          x2="168"
          y2="-14"
          stroke={ORANGE}
          strokeWidth="26"
          strokeLinecap="round"
        />
        <g clipPath={`url(#${clipId})`}>
          <g strokeWidth="6" strokeLinejoin="round">
            {CELLS.map((c) => {
              const color = c.orange ? ORANGE : OFF_WHITE;
              return (
                <polygon
                  key={`${c.x}-${c.y}`}
                  points={HEX}
                  transform={`translate(${c.x} ${c.y})`}
                  fill={color}
                  stroke={color}
                />
              );
            })}
          </g>
        </g>
      </g>
    </svg>
  );
}

export default Logo;
