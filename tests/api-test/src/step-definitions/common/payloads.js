const payloads = {
    "Dev Login": () => ({
        name: "Aura Test Kullanici",
        email: `test.${Date.now()}@aura.local`
    }),
    "Dev Login Admin": () => ({
        name: "Aura Test Admin",
        email: `admin.${Date.now()}@aura.local`,
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
    "Perfume Advisor Request Too Long": () => ({
        gender: "erkek",
        freeText: "a".repeat(1001)
    })
};

module.exports = {
    payloads
};
