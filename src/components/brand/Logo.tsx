interface LogoProps {
  size?: number;
  withBackground?: boolean;
  className?: string;
}

const CELLS: { x: number; y: number; orange: boolean }[] = [
  { x: -132, y: -76.21, orange: false },
  { x: -132, y: 0, orange: false },
  { x: -132, y: 76.21, orange: false },
  { x: -66, y: -114.32, orange: false },
  { x: -66, y: -38.11, orange: false },
  { x: -66, y: 38.11, orange: false },
  { x: -66, y: 114.32, orange: false },
  { x: 0, y: -76.21, orange: false },
  { x: 0, y: 0, orange: false },
  { x: 0, y: 76.21, orange: false },
  { x: 66, y: -114.32, orange: false },
  { x: 66, y: 114.32, orange: false },
  { x: 66, y: -38.11, orange: true },
  { x: 66, y: 38.11, orange: true },
  { x: 132, y: -76.21, orange: true },
  { x: 132, y: 0, orange: true },
  { x: 132, y: 76.21, orange: true },
];

const HEX = "37,0 18.5,32.04 -18.5,32.04 -37,0 -18.5,-32.04 18.5,-32.04";
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
          x1="88"
          y1="4"
          x2="170"
          y2="-14"
          stroke={ORANGE}
          strokeWidth="28"
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
