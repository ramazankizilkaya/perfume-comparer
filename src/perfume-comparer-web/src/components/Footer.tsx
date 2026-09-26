import Link from "next/link";
import { blogHref, localeHref, searchHref } from "@/lib/urls";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="shell">
                <div className="footer-grid">
                    <div>
                        <Link href={localeHref("/")} className="logo">
                            Aura<em>Compare</em>
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

                <p className="footer-note">© {new Date().getFullYear()} AuraCompare · Puanlar ve yorumlar kullanıcılardan gelir.</p>
            </div>
        </footer>
    );
}
