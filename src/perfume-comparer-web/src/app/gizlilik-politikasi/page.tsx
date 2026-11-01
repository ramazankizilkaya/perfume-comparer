import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/Breadcrumb";
import { CONTACT_EMAIL, SITE_NAME, pageMetadata } from "@/lib/seo";
import { privacyHref } from "@/lib/urls";

export const metadata: Metadata = pageMetadata({
    title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    description: `${SITE_NAME} hangi kişisel verileri neden toplar, kimlerle paylaşır, ne kadar saklar ve verilerinizi nasıl sildirebilirsiniz.`,
    path: privacyHref(),
});

const UPDATED = "1 Kasım 2026";

export default function PrivacyPolicyPage() {
    return (
        <>
            <PageBreadcrumb trail={[{ label: "Gizlilik politikası" }]} />

            <article className="legal-page">
                <header>
                    <span className="eyebrow">Gizlilik</span>
                    <h1 className="page-title">Gizlilik politikası ve KVKK aydınlatma metni</h1>
                    <p className="section-desc">Son güncelleme: {UPDATED}</p>
                </header>

                <section>
                    <h2>1. Veri sorumlusu</h2>
                    <p>
                        {SITE_NAME} (parfumetre.com), parfümleri karşılaştıran bir bilgi sitesidir. Bu metin, 6698
                        sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu olarak {SITE_NAME}
                        {" "}tarafından hazırlanmıştır. Bize <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
                        adresinden ulaşabilirsiniz.
                    </p>
                </section>

                <section>
                    <h2>2. Hangi verileri topluyoruz?</h2>
                    <ul>
                        <li>
                            <strong>Hesap bilgileri.</strong> Google veya Facebook ile giriş yaptığınızda adınızı,
                            e-posta adresinizi ve profil fotoğrafınızın adresini alırız. Şifrenizi görmeyiz ve
                            saklamayız.
                        </li>
                        <li>
                            <strong>Sitede ürettiğiniz içerik.</strong>{" "}
                            Yorumlarınız, puanlarınız, favorileriniz,
                            &quot;Bu parfümü kullanıyorum&quot; işaretleriniz, karşılaştırma oyunuz, yüklediğiniz
                            fotoğraflar ve blog yazılarınız.
                        </li>
                        <li>
                            <strong>Teknik veriler.</strong> IP adresiniz ve tarayıcı bilginiz. IP adresini isteklerin
                            sınırlanması ve bir parfümün görüntülenme sayısının aynı kişi için tekrar
                            sayılmaması için kullanırız.
                        </li>
                        <li>
                            <strong>Yapay zekâ özelliklerine yazdıklarınız.</strong>{" "}
                            Arama kutusuna yazdığınız
                            cümle ve &quot;Bana Parfüm Öner&quot; formuna girdiğiniz bilgiler.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>3. Verileri neden kullanıyoruz?</h2>
                    <ul>
                        <li>Giriş yapmanızı ve yorum, puan, favori gibi özellikleri kullanmanızı sağlamak. Hukuki sebep: sözleşmenin kurulması ve ifası (KVKK m.5/2-c).</li>
                        <li>Siteyi kötüye kullanıma, aşırı isteğe ve sahte puanlamaya karşı korumak. Hukuki sebep: meşru menfaat (KVKK m.5/2-f).</li>
                        <li>Arama ve parfüm önerisi gibi yapay zekâ özelliklerini çalıştırmak. Hukuki sebep: sözleşmenin ifası ve meşru menfaat.</li>
                        <li>Yasal yükümlülüklerimizi yerine getirmek. Hukuki sebep: hukuki yükümlülük (KVKK m.5/2-ç).</li>
                    </ul>
                    <p>Kişisel verilerinizi satmayız ve reklam amacıyla kullanmayız.</p>
                </section>

                <section>
                    <h2>4. Verileri kimlerle paylaşıyoruz?</h2>
                    <ul>
                        <li><strong>Google ve Meta (Facebook).</strong> Giriş yaptığınızda kimliğinizi doğrularlar.</li>
                        <li>
                            <strong>Yapay zekâ servisleri (Google Gemini, Anthropic).</strong> Arama cümleniz, öneri
                            formunuz ve yorum özetleri için yorum metinleri bu servislere gönderilir.
                        </li>
                        <li><strong>Barındırma ve altyapı sağlayıcıları.</strong> Siteyi ve veritabanını çalıştıran şirketler.</li>
                        <li>Kanunen yetkili kamu kurumları, talep etmeleri halinde.</li>
                    </ul>
                    <p>
                        Bu hizmet sağlayıcıların bir kısmı yurt dışında olabilir. Bu durumda verileriniz KVKK m.9
                        kapsamında yurt dışına aktarılmış olur.
                    </p>
                </section>

                <section>
                    <h2>5. Çerezler ve tarayıcı depolaması</h2>
                    <p>
                        Reklam veya takip çerezi kullanmayız. Tarayıcınıza yalnızca siteyi çalıştıran şunları
                        yazarız: cinsiyet tercihinizi tutan bir çerez, oturum bilginiz, tema seçiminiz, son
                        baktığınız parfümler ve giriş yapmadan oy verdiğinizde oyunuzu size bağlayan rastgele bir
                        kimlik. Bunları tarayıcı ayarlarından silebilirsiniz. Google ve Facebook giriş pencereleri
                        kendi çerezlerini kullanabilir.
                    </p>
                </section>

                <section>
                    <h2>6. Verileri ne kadar saklıyoruz?</h2>
                    <p>
                        Hesap verilerinizi ve içeriklerinizi hesabınız açık olduğu sürece saklarız. Silme talebiniz
                        olursa verilerinizi sileriz ya da kimliğinizi belirsiz hale getiririz. Yasal bir saklama
                        yükümlülüğü varsa süre bitene kadar saklarız.
                    </p>
                </section>

                <section>
                    <h2>7. KVKK kapsamındaki haklarınız</h2>
                    <p>KVKK m.11 gereği bize başvurarak şunları isteyebilirsiniz:</p>
                    <ul>
                        <li>Verilerinizin işlenip işlenmediğini öğrenmek ve bilgi almak.</li>
                        <li>İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenmek.</li>
                        <li>Verilerin aktarıldığı kişileri öğrenmek.</li>
                        <li>Eksik veya yanlış işlenen verilerin düzeltilmesini istemek.</li>
                        <li>Verilerin silinmesini veya yok edilmesini istemek.</li>
                        <li>Bu işlemlerin verilerin aktarıldığı kişilere bildirilmesini istemek.</li>
                        <li>Otomatik analiz sonucu aleyhinize çıkan bir sonuca itiraz etmek.</li>
                        <li>Kanuna aykırı işleme nedeniyle zarara uğradıysanız zararın giderilmesini istemek.</li>
                    </ul>
                    <p>
                        Başvurunuzu <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine yazın. En geç
                        30 gün içinde yanıt veririz.
                    </p>
                </section>

                <section id="veri-silme">
                    <h2>8. Hesabınızı ve verilerinizi sildirme</h2>
                    <p>
                        Hesabınızı ve ona bağlı tüm verileri silmek için giriş yaptığınız e-posta adresinizle{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
                        adresine &quot;Hesabımı sil&quot;
                        başlıklı bir e-posta gönderin. Hesabınızın size ait olduğunu doğruladıktan sonra yorumlarınızı,
                        puanlarınızı, favorilerinizi ve fotoğraflarınızı en geç 30 gün içinde sileriz.
                    </p>
                    <p>
                        Facebook ile giriş yaptıysanız, Facebook hesap ayarlarındaki &quot;Uygulamalar ve web
                        siteleri&quot; bölümünden {SITE_NAME} uygulamasını kaldırarak da erişimi
                        kesebilirsiniz. Kaldırmak sitedeki hesabınızı silmez, bunun için yukarıdaki e-postayı
                        göndermeniz gerekir.
                    </p>
                </section>

                <section>
                    <h2>9. Bu metindeki değişiklikler</h2>
                    <p>
                        Bu metni gerektiğinde güncelleriz. Güncel hali her zaman bu sayfadadır ve en üstteki
                        &quot;Son güncelleme&quot; tarihi değişir.
                    </p>
                </section>
            </article>
        </>
    );
}
