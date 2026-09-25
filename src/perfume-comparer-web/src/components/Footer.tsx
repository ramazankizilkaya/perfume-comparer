import Link from "next/link";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="shell">
                <div className="footer-grid">
                    <div>
                        <Link href="/" className="logo">
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
                            <li><Link href="/detayli-arama">Tüm parfümler</Link></li>
                            <li><Link href="/karsilastir">Karşılaştırma</Link></li>
                            <li><Link href="/blog">Koku rehberi</Link></li>
                            <li><Link href="/admin">Veri yönetimi</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Koku aileleri</h4>
                        <ul>
                            <li><Link href="/detayli-arama?family=oryantal">Oryantal</Link></li>
                            <li><Link href="/detayli-arama?family=odunsu">Odunsu</Link></li>
                            <li><Link href="/detayli-arama?family=ferah">Ferah</Link></li>
                            <li><Link href="/detayli-arama?family=ciceksi">Çiçeksi</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Cinsiyet</h4>
                        <ul>
                            <li><Link href="/detayli-arama?gender=erkek">Erkek parfümleri</Link></li>
                            <li><Link href="/detayli-arama?gender=kadin">Kadın parfümleri</Link></li>
                            <li><Link href="/detayli-arama?gender=unisex">Unisex</Link></li>
                        </ul>
                    </div>
                </div>

                <p className="footer-note">© {new Date().getFullYear()} AuraCompare · Puanlar ve yorumlar kullanıcılardan gelir.</p>
            </div>
        </footer>
    );
}
