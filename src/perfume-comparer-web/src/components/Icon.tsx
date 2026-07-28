/**
 * Minimal inline SVG icon set — replaces the FontAwesome CDN stylesheet.
 * Stroke-based, inherits currentColor and font size.
 */

export type IconName =
    | "search"
    | "close"
    | "arrow-right"
    | "arrow-left"
    | "chevron-right"
    | "chevron-down"
    | "swap"
    | "sun"
    | "moon"
    | "external"
    | "bell"
    | "settings"
    | "calendar"
    | "user"
    | "send"
    | "layers"
    | "heart"
    | "check"
    | "plus"
    | "filter"
    | "sparkle"
    | "trash";

const PATHS: Record<IconName, React.ReactNode> = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </>
    ),
    close: <path d="M6 6l12 12M18 6L6 18" />,
    "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
    "arrow-left": <path d="M19 12H5M11 18l-6-6 6-6" />,
    "chevron-right": <path d="m9 6 6 6-6 6" />,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    swap: <path d="M7 8h13l-3-3M17 16H4l3 3" />,
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
    ),
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
    external: <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    bell: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0" />,
    settings: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </>
    ),
    send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
    layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 14l9 5 9-5" />,
    heart: <path d="M12 20.3C10.1 18.8 3.8 14.4 3.8 9.3c0-2.6 2-4.6 4.5-4.6 1.6 0 3 .9 3.7 2.2.7-1.3 2.1-2.2 3.7-2.2 2.5 0 4.5 2 4.5 4.6 0 5.1-6.3 9.5-8.2 11z" />,
    check: <path d="M5 12.5 10 17.5 19.5 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    sparkle: <path d="M12 3l1.9 4.9L19 10l-5.1 2.1L12 17l-1.9-4.9L5 10l5.1-2.1zM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />,
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1L18 7" />,
};

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
    /** İçi dolu göster (ör. seçili kalp). */
    filled?: boolean;
    "aria-hidden"?: boolean;
}

export default function Icon({ name, size = 16, className, filled = false }: IconProps) {
    return (
        <svg
            className={`icon ${className ?? ""}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name]}
        </svg>
    );
}
