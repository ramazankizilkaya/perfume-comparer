import Link from "next/link";
import { blogHref, localeHref, privacyHref, searchHref } from "@/lib/urls";
import { SITE_NAME } from "@/lib/seo";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="shell">
                <div className="footer-grid">
                    <div>
                        <Link href={localeHref("/")} className="logo" aria-label="Parfümetre">
                            <img
                                src="/logo.png"
                                alt="Parfümetre - Parfüm Karşılaştırma ve Koku Rehberi"
                                className="site-logo-img light-only"
                                width={178}
                                height={42}
                            />
                            <img
                                src="/logo-dark.png"
                                alt="Parfümetre - Parfüm Karşılaştırma ve Koku Rehberi"
                                className="site-logo-img dark-only"
                                width={178}
                                height={42}
                            />
                        </Link>
                        <p className="footer-blurb">
                            Parfümleri notalarına, koku ailesine, mevsim ve yaş uyumuna göre
                            karşılaştıran bağımsız bir koku bilgi portalı.
                        </p>
                    </div>

                    <div>
                        <h4>Keşfet</h4>
                        <ul>
                            <li><Link href={searchHref()}>Tüm parfümler</Link></li>
                            <li><Link href={localeHref("/karsilastir")}>Karşılaştırma</Link></li>
                            <li><Link href={blogHref()}>Koku rehberi</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Koku aileleri</h4>
                        <ul>
                            <li><Link href={searchHref({ family: "oryantal" })}>Oryantal</Link></li>
                            <li><Link href={searchHref({ family: "odunsu" })}>Odunsu</Link></li>
                            <li><Link href={searchHref({ family: "ferah" })}>Ferah</Link></li>
                            <li><Link href={searchHref({ family: "ciceksi" })}>Çiçeksi</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Cinsiyet</h4>
                        <ul>
                            <li><Link href={searchHref({ gender: "erkek" })}>Erkek parfümleri</Link></li>
                            <li><Link href={searchHref({ gender: "kadin" })}>Kadın parfümleri</Link></li>
                            <li><Link href={searchHref({ gender: "unisex" })}>Unisex</Link></li>
                        </ul>
                    </div>
                </div>

                <p className="footer-note">© {new Date().getFullYear()} {SITE_NAME} · Puanlar ve yorumlar kullanıcılardan gelir. · <Link href={privacyHref()}>Gizlilik politikası</Link></p>
            </div>
        </footer>
    );
}
