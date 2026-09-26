const payloads = {
    "Dev Login": () => ({
        name: "Aura Test Kullanici",
        email: `test.${Date.now()}@aura.local`
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
