"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { API_BASE } from "@/lib/urls";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export interface Crumb {
    level: string;
    label: string;
    slug: string;
    /** Frontend'de kurulan kırıntılar için doğrudan hedef (API'den gelenlerde yok). */
    href?: string;
}

interface Opt {
    label: string;
    slug: string;
}

interface CrumbOption {
    label: string;
    slug: string;
    href: string;
}

interface Meta {
    brands: Opt[];
    concentrations: Opt[];
}

const GENDERS: Opt[] = [
    { label: "Erkek", slug: "erkek" },
    { label: "Kadın", slug: "kadin" },
    { label: "Unisex", slug: "unisex" },
];

// breadcrumb seviyesi -> arama parametresi (bu seviyeler açılır menü olur)
const PARAM: Record<string, string> = {
    gender: "gender",
    concentration: "concentration",
    brand: "brand",
};

function getPrecedingParams(items: Crumb[], upToIndex: number): URLSearchParams {
    const sp = new URLSearchParams();
    for (let idx = 0; idx < upToIndex; idx++) {
        const it = items[idx];
        const p = PARAM[it.level];
        if (p && it.slug) {
            sp.set(p, it.slug);
        }
    }
    return sp;
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
    const pathname = usePathname();
    const localeMatch = pathname?.match(/^\/([a-z]{2})(\/|$)/);
    // Ön ek bulunamazsa (sunucu tarafında iç yol görünebilir) varsayılan dil kullanılır;
    // böylece breadcrumb linkleri hiçbir zaman yönlendirmeye uğramaz.
    const prefix = localeMatch ? `/${localeMatch[1]}` : `/${DEFAULT_LOCALE}`;
    const searchBase = `${prefix}/detayli-arama`;

    const [meta, setMeta] = useState<Meta | null>(null);
    const needsMeta = items.some((i) => PARAM[i.level]);

    useEffect(() => {
        if (!needsMeta) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/meta/filters`);
                if (res.ok) {
                    const d = await res.json();
                    setMeta({
                        brands: (d.brands ?? []).map((b: { name: string; slug: string }) => ({ label: b.name, slug: b.slug })),
                        concentrations: (d.concentrations ?? []).map((c: { name: string; slug: string }) => ({ label: c.name, slug: c.slug })),
                    });
                }
            } catch {
                /* dropdown olmadan da breadcrumb çalışır */
            }
        })();
    }, [needsMeta]);

    const optionsFor = (level: string): Opt[] => {
        if (level === "gender") return GENDERS;
        if (level === "concentration") return meta?.concentrations ?? [];
        if (level === "brand") return meta?.brands ?? [];
        return [];
    };

    return (
        <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
                {items.map((item, i) => {
                    const last = i === items.length - 1;
                    if (last) {
                        return (
                            <li key={i}>
                                <span aria-current="page">{item.label}</span>
                            </li>
                        );
                    }
                    if (item.level === "home") {
                        return (
                            <li key={i}>
                                <Link href={prefix || "/"}>{item.label}</Link>
                                <Icon name="chevron-right" size={12} className="crumb-sep" />
                            </li>
                        );
                    }

                    const param = PARAM[item.level];
                    const preceding = getPrecedingParams(items, i);

                    // Kendisi için doğrudan hedef (item.href yoksa önceki filtrelerle birleşik arama)
                    const selfParams = new URLSearchParams(preceding);
                    if (param && item.slug) {
                        selfParams.set(param, item.slug);
                    }
                    const selfQuery = selfParams.toString();
                    const selfFallback = selfQuery ? `${searchBase}?${selfQuery}` : searchBase;
                    const selfHref = item.href ?? selfFallback;

                    // Açılır menüdeki seçenekler: kendisinden önceki seçimleri taşır ve seçilen değeri ekler
                    const rawOptions = optionsFor(item.level);
                    const options: CrumbOption[] = rawOptions.map((o) => {
                        const optParams = new URLSearchParams(preceding);
                        if (param) {
                            optParams.set(param, o.slug);
                        }
                        const q = optParams.toString();
                        return {
                            label: o.label,
                            slug: o.slug,
                            href: q ? `${searchBase}?${q}` : searchBase,
                        };
                    });

                    return (
                        <li key={i}>
                            <CrumbDrop
                                label={item.label}
                                selfHref={selfHref}
                                hasMenu={!!param && options.length > 0}
                                options={options}
                            />
                            <Icon name="chevron-right" size={12} className="crumb-sep" />
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/** Sayfaların çoğunda kırıntı sabit: Anasayfa > (ara seviyeler) > bu sayfa. */
export function PageBreadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
    const items: Crumb[] = [
        { level: "home", label: "Anasayfa", slug: "" },
        ...trail.map((t) => ({ level: "page", label: t.label, slug: "", href: t.href })),
    ];
    return <Breadcrumb items={items} />;
}

function CrumbDrop({
    label,
    selfHref,
    hasMenu,
    options,
}: {
    label: string;
    selfHref: string;
    hasMenu: boolean;
    options: CrumbOption[];
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const showMenu = hasMenu && options.length > 0;

    return (
        <span className="crumb-drop" ref={ref}>
            {showMenu ? (
                <button
                    type="button"
                    className="crumb-trigger"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                >
                    {label}
                    <Icon name="chevron-down" size={11} />
                </button>
            ) : (
                <Link href={selfHref}>{label}</Link>
            )}

            {open && showMenu && (
                <div className="crumb-menu">
                    {options.map((o) => (
                        <Link
                            key={o.slug}
                            href={o.href}
                            className="crumb-menu-item"
                            onClick={() => setOpen(false)}
                        >
                            {o.label}
                        </Link>
                    ))}
                </div>
            )}
        </span>
    );
}
