"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { API_BASE } from "@/lib/urls";

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

export default function Breadcrumb({ items }: { items: Crumb[] }) {
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
                                <Link href="/">{item.label}</Link>
                                <Icon name="chevron-right" size={12} className="crumb-sep" />
                            </li>
                        );
                    }
                    const param = PARAM[item.level];
                    return (
                        <li key={i}>
                            <CrumbDrop
                                label={item.label}
                                selfHref={item.href ?? (param ? `/ara?${param}=${item.slug}` : "/ara")}
                                param={param}
                                options={optionsFor(item.level)}
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

function CrumbDrop({ label, selfHref, param, options }: { label: string; selfHref: string; param?: string; options: Opt[] }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const hasMenu = !!param && options.length > 0;

    return (
        <span className="crumb-drop" ref={ref}>
            {hasMenu ? (
                <button className="crumb-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                    {label}
                    <Icon name="chevron-down" size={11} />
                </button>
            ) : (
                <Link href={selfHref}>{label}</Link>
            )}

            {open && hasMenu && (
                <div className="crumb-menu">
                    {options.map((o) => (
                        <Link
                            key={o.slug}
                            href={`/ara?${param}=${o.slug}`}
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
