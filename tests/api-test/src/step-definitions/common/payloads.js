const fs = require('fs');
const path = require('path');

/**
 * Panel şifresi: önce ADMIN_PASSWORD ortam değişkeni, yoksa yerel API'nin
 * appsettings.Local.json dosyasındaki Admin:Password (testler API ile aynı makinede koşar).
 */
function adminPanelPassword() {
    if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
    try {
        const file = path.resolve(__dirname, '../../../../../src/PerfumeComparer/appsettings.Local.json');
        return JSON.parse(fs.readFileSync(file, 'utf8'))?.Admin?.Password || '';
    } catch {
        return '';
    }
}

const payloads = {
    "Dev Login": () => ({
        name: "Aura Test Kullanici",
        email: `test.${Date.now()}@aura.local`
    }),
    "Admin Login Valid": () => ({
        password: adminPanelPassword()
    }),
    "Admin Login Wrong": () => ({
        password: `yanlis-${Date.now()}`
    }),
    "Admin Login Empty": () => ({
        password: ""
    }),
    "Dev Login Admin": () => ({
        name: "Aura Test Admin",
        email: `admin.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@aura.local`,
        admin: true
    }),
    "Comment Too Long": () => ({
        rating: 5,
        content: "a".repeat(4001)
    }),
    "Review Comment Too Long": () => ({
        score: 5,
        comment: "a".repeat(4001)
    }),
    "Create Blog Post": () => ({
        title: "Test yazısı",
        body: "Test içeriği."
    }),
    "Create Blog Post Body Too Long": () => ({
        title: "Çok uzun yazı başlığı",
        body: "a".repeat(50001)
    }),
    "Empty Google Credential": () => ({
        credential: ""
    }),
    "Invalid Google Credential": () => ({
        credential: "invalid.google.jwt.token"
    }),
    "Empty Facebook Credential": () => ({
        credential: ""
    }),
    "Invalid Facebook Credential": () => ({
        credential: "invalid-facebook-access-token"
    }),
    "Submit Comment": () => ({
        rating: 5,
        content: "Mükemmel kalıcılık ve koku yayılımı."
    }),
    "Profane Comment": () => ({
        rating: 1,
        content: "siktir git bu ne biçim koku"
    }),
    "Profane Comment Capital Letters": () => ({
        rating: 1,
        content: "SİKTİR GİT, KOKUSU YARRAK GİBİ"
    }),
    "Profane Comment Spaced Out": () => ({
        rating: 1,
        content: "bu koku s i k t i r"
    }),
    "Profane Comment With Digits": () => ({
        rating: 1,
        content: "s1ktir git, y4rr4k gibi koku"
    }),
    "Profane Comment Stretched": () => ({
        rating: 1,
        content: "siiiiktir"
    }),
    "Profane Comment Added Words": () => ({
        rating: 1,
        content: "sürtük gibi kokuyor, kancık bir koku"
    }),
    "Look Alike Comment": () => ({
        rating: 5,
        content: "Sikke gibi parlak şişe, tamı tamına beklediğim koku. İki sıkım yeterli, sıkıcı değil. Eve götürdüm."
    }),
    "Invalid Comment Rating Low": () => ({
        rating: 0,
        content: "Çok kötü."
    }),
    "Invalid Comment Rating High": () => ({
        rating: 6,
        content: "Aşırı yüksek puan."
    }),
    "Empty Comment Content": () => ({
        rating: 5,
        content: "    "
    }),
    "Comparison Vote First Perfume": () => ({
        preferredSlug: "dior-sauvage"
    }),
    "Comparison Vote Second Perfume": () => ({
        preferredSlug: "versace-versace-pour-homme-dylan-blue"
    }),
    "Comparison Vote Retract": () => ({
        preferredSlug: null
    }),
    "Comparison Vote Unrelated Perfume": () => ({
        preferredSlug: "bu-parfum-karsilastirmada-yok"
    }),
    "Record Usage": () => ({
        ageGroup: "25-34"
    }),
    "Invalid Usage AgeGroup": () => ({
        ageGroup: "99-invalid-age-group"
    }),
    "Submit Review": () => ({
        score: 5,
        longevity: "long_lasting",
        sillage: "strong",
        comment: "Harika bir koku deneyimi."
    }),
    "Submit Review With Seasons": () => ({
        score: 5,
        longevity: "long_lasting",
        sillage: "strong",
        seasons: ["spring", "autumn"],
        comment: "İlkbahar ve sonbahar için çok dengeli bir koku."
    }),
    "Review Profane Comment": () => ({
        score: 5,
        longevity: "long_lasting",
        comment: "taşşak gibi bir koku"
    }),
    "Profane Comparison Comment": () => ({
        content: "amk bu ikisi de çöp"
    }),
    "Submit Review Invalid Score": () => ({
        score: null,
        longevity: "long_lasting"
    }),
    "Perfume Advisor Request": () => ({
        gender: "erkek",
        likedPerfumes: "Dior Sauvage",
        preferredNotes: "ferah, narenciye, odunsu",
        occasion: "Günlük / Ofis",
        season: "Dört Mevsim",
        freeText: "Kalıcı ve zarif bir ofis kokusu arıyorum."
    }),
    "Contact Message": () => ({
        name: "Test Kullanıcı",
        email: "test.contact@aura.local",
        message: `API testi iletişim mesajı ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        website: ""
    }),
    "Contact Message Honeypot": () => ({
        name: "Spam Bot",
        email: "bot@spam.local",
        message: "Ucuz takipçi satın alın, hemen tıklayın.",
        website: "https://spam.example"
    }),
    "Contact Message Invalid Email": () => ({
        name: "Test Kullanıcı",
        email: "gecersiz-adres",
        message: "Bu mesajın e-postası geçersiz."
    }),
    "Contact Message Too Many Links": () => ({
        name: "Test Kullanıcı",
        email: "test.contact@aura.local",
        message: "http://a.example http://b.example http://c.example bağlantılara bakın."
    }),
    "Perfume Advisor Request Too Long": () => ({
        gender: "erkek",
        freeText: "a".repeat(1001)
    })
};

module.exports = {
    payloads
};
