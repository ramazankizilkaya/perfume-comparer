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
    "Submit Comment": () => ({
        rating: 5,
        content: "Mükemmel kalıcılık ve koku yayılımı."
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
    "Submit Review Invalid Score": () => ({
        score: null,
        longevity: "long_lasting"
    })
};

module.exports = {
    payloads
};
