"use client";

import Icon from "./Icon";
import { useTheme } from "@/lib/theme";

/** Kullanıcı menüsü ve hamburger menüdeki "Karanlık Mod" anahtarı; tıklamak menüyü kapatmaz. */
export default function DarkModeSwitch({ className }: { className: string }) {
    const { theme, toggleTheme } = useTheme();
    const on = theme === "dark";

    return (
        <button type="button" role="switch" aria-checked={on} className={`${className} dark-mode-switch`} onClick={toggleTheme}>
            <Icon name="moon" size={className === "mobile-nav-link" ? 16 : 15} />
            <span>Karanlık Mod</span>
            <span className={`switch-track${on ? " on" : ""}`} aria-hidden="true">
                <span className="switch-thumb" />
            </span>
        </button>
    );
}
