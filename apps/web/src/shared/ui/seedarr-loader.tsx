import { cn } from "@/lib/utils";

interface SeedarrLoaderProps {
  className?: string;
  size?: number;
}

export function SeedarrLoader({ className, size = 100 }: SeedarrLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 5960 5900"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading"
      >
        <title>Loading</title>
        {/* Play button (static) */}
        <g fill="rgb(102,155,71)">
          <path d="M2900 5873 c-523 -29 -982 -225 -1343 -572 -351 -338 -541 -826 -499 -1279 22 -227 59 -357 157 -557 85 -171 173 -292 320 -440 288 -289 650 -472 1085 -547 106 -19 164 -22 385 -23 286 0 385 12 606 74 521 147 960 501 1175 947 96 199 142 385 151 610 16 363 -105 729 -342 1039 -59 78 -219 239 -306 309 -229 184 -567 339 -871 401 -101 20 -414 50 -453 43 -5 -1 -35 -3 -65 -5z m112 -1253 c178 -106 384 -229 458 -273 248 -148 300 -184 316 -222 27 -65 14 -125 -38 -171 -12 -12 -99 -67 -193 -121 -894 -522 -867 -507 -925 -511 -45 -3 -61 0 -90 20 -73 49 -70 20 -70 722 0 620 0 630 21 673 28 58 76 84 146 80 47 -3 82 -22 375 -197z" />
        </g>

        {/* Leaves (animated) */}
        <g fill="rgb(164,199,117)">
          {/* Left leaf */}
          <path
            d="M2130 2293 c-365 -38 -674 -240 -868 -568 -79 -134 -153 -340 -168 -471 l-6 -51 88 -17 c311 -56 564 -36 791 61 241 105 462 314 583 553 72 144 161 413 142 432 -10 9 -191 45 -292 57 -80 10 -194 12 -270 4z"
            style={{
              transformOrigin: "center",
              animation: "growLeaf 1.5s ease-in-out infinite",
              animationDelay: "0s",
            }}
          />
          {/* Right leaf */}
          <path
            d="M3490 2283 c-71 -11 -229 -46 -239 -53 -30 -18 80 -332 169 -485 85 -145 223 -292 356 -381 228 -152 458 -213 757 -201 133 5 303 29 320 46 12 12 -21 162 -59 274 -147 424 -468 714 -877 792 -73 14 -357 19 -427 8z"
            style={{
              transformOrigin: "center",
              animation: "growLeaf 1.5s ease-in-out infinite",
              animationDelay: "0.5s",
            }}
          />
          {/* Center leaf */}
          <path
            d="M2886 1968 c-126 -133 -249 -312 -305 -444 -162 -383 -120 -785 121 -1141 55 -83 178 -231 233 -283 l37 -35 70 75 c205 220 339 458 388 690 7 30 14 114 17 185 11 284 -70 537 -251 782 -80 109 -206 243 -227 243 -8 0 -45 -33 -83 -72z"
            style={{
              transformOrigin: "center",
              animation: "growLeaf 1.5s ease-in-out infinite",
              animationDelay: "1s",
            }}
          />
        </g>

        <style>
          {`
            @keyframes growLeaf {
              0%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
              }
              50% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
      </svg>
    </div>
  );
}
