const Joi = require('joi');

const userScheme = Joi.object({
    id: Joi.number().integer().required(),
    email: Joi.string().required(),
    displayName: Joi.string().allow(null, '').optional(),
    name: Joi.string().allow(null, '').optional(),
    picture: Joi.string().allow(null, '').optional()
}).required().unknown(true);

const perfumeItemScheme = Joi.object({
    name: Joi.string().required(),
    slug: Joi.string().required(),
    brand: Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().required()
    }).required().unknown(true),
    gender: Joi.string().required()
}).required().unknown(true);

const brandItemScheme = Joi.object({
    id: Joi.number().integer().required(),
    name: Joi.string().required(),
    slug: Joi.string().required(),
    perfumeCount: Joi.number().integer().min(0).required(),
    logoUrl: Joi.string().allow(null, '').optional(),
    country: Joi.string().allow(null, '').optional()
}).required().unknown(true);

const responseValidationSchemes = {
    "Dev Login": Joi.object({
        token: Joi.string().min(10).required(),
        user: userScheme
    }).required().unknown(true),

    "Me": userScheme,

    "Admin Analytics": (() => {
        const count = Joi.object({ total: Joi.number().integer().min(0).required(), period: Joi.number().integer().min(0).required() }).required();
        const rank = Joi.array().items(Joi.object({
            title: Joi.string().required(),
            subtitle: Joi.string().allow(null, ''),
            path: Joi.string().allow(null, ''),
            value: Joi.number().integer().min(0).required()
        }).unknown(true)).required();
        return Joi.object({
            days: Joi.number().valid(30).required(),
            summary: Joi.object({
                visitors: Joi.object({
                    last24h: Joi.number().integer().min(0).required(),
                    last7d: Joi.number().integer().min(0).required(),
                    last30d: Joi.number().integer().min(0).required(),
                    allTime: Joi.number().integer().min(0).required(),
                    perfumePageViews: Joi.number().integer().min(0).required()
                }).required(),
                users: count,
                perfumeComments: count,
                comparisonComments: count,
                recommendations: count,
                ratings: count,
                favorites: count,
                comparisonVotes: count,
                blogViews: Joi.number().integer().min(0).required(),
                blogsByStatus: Joi.object({
                    Pending: Joi.number().integer().min(0).required(),
                    Published: Joi.number().integer().min(0).required()
                }).unknown(true).required()
            }).unknown(true).required(),
            daily: Joi.array().length(30).items(Joi.object({
                date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
                comments: Joi.number().integer().min(0).required(),
                recommendations: Joi.number().integer().min(0).required(),
                newUsers: Joi.number().integer().min(0).required()
            }).unknown(true)).required(),
            topPerfumes: rank,
            topPerfumesAllTime: rank,
            topBlogs: rank,
            mostCommented: rank,
            mostRecommended: rank,
            mostFavorited: rank,
            topComparisons: rank,
            advisor: Joi.object({
                gender: Joi.array().required(),
                occasion: Joi.array().required(),
                season: Joi.array().required()
            }).required()
        }).required().unknown(true);
    })(),

    "Admin Blogs": Joi.array().items(Joi.object({
        id: Joi.number().integer().required(),
        title: Joi.string().required(),
        slug: Joi.string().required(),
        body: Joi.string().allow('').required(),
        status: Joi.string().valid('Draft', 'Pending', 'Published', 'Rejected').required(),
        authorName: Joi.string().required()
    }).unknown(true)).required(),

    "Admin Comments": Joi.array().items(Joi.object({
        id: Joi.number().integer().required(),
        kind: Joi.string().valid('perfume', 'comparison').required(),
        body: Joi.string().required(),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').required(),
        subject: Joi.string().required()
    }).unknown(true)).required(),

    "Admin Recommendations": Joi.array().items(Joi.object({
        id: Joi.number().integer().required(),
        perfumeName: Joi.string().required(),
        promptJson: Joi.string().allow('').required(),
        advice: Joi.string().allow('').required()
    }).unknown(true)).required(),

    "Get Perfumes": Joi.object({
        items: Joi.array().items(perfumeItemScheme).required(),
        totalCount: Joi.number().integer().min(0).required(),
        page: Joi.number().integer().min(1).required(),
        pageSize: Joi.number().integer().min(1).required()
    }).required().unknown(true),

    "Get Perfume Detail": Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().required(),
        brand: Joi.object({
            name: Joi.string().required(),
            slug: Joi.string().required()
        }).required().unknown(true)
    }).required().unknown(true),

    "Get Perfume Detail With Article And Faq": Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().required(),
        brand: Joi.object({
            name: Joi.string().required(),
            slug: Joi.string().required()
        }).required().unknown(true),
        article: Joi.string().min(100).required(),
        faq: Joi.array().items(
            Joi.object({
                question: Joi.string().required(),
                answer: Joi.string().required()
            })
        ).min(1).required()
    }).required().unknown(true),

    "Get Brands": Joi.array().items(brandItemScheme).required(),

    "Get Random Brands": Joi.array().items(brandItemScheme).required(),

    "Get Brand Detail": Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().required(),
        perfumeCount: Joi.number().integer().min(0).required()
    }).required().unknown(true),

    "Get Filter Meta": Joi.object({
        brands: Joi.array().required(),
        fragranceFamilies: Joi.array().required(),
        notes: Joi.array().required(),
        accords: Joi.array().required()
    }).required().unknown(true),

    "Get Popular Comparisons": Joi.array().items(
        Joi.object({
            perfume1: Joi.object().required().unknown(true),
            perfume2: Joi.object().required().unknown(true)
        }).unknown(true)
    ).required(),

    "Get AI Comparison Analysis": Joi.object({
        summary: Joi.string().required()
    }).required().unknown(true),

    "Get Comparison Votes": Joi.object({
        total: Joi.number().integer().min(0).required(),
        myVote: Joi.string().allow(null),
        options: Joi.array().length(2).items(
            Joi.object({
                slug: Joi.string().required(),
                votes: Joi.number().integer().min(0).required(),
                percent: Joi.number().integer().min(0).max(100).required()
            }).unknown(true)
        ).required()
    }).required().unknown(true),

    "Comparison Votes Without My Vote": Joi.object({
        myVote: Joi.valid(null).required()
    }).required().unknown(true),

    "Get Blogs": Joi.array().items(
        Joi.object({
            id: Joi.number().integer().required(),
            title: Joi.string().required(),
            slug: Joi.string().required(),
            category: Joi.string().allow(null).required(),
            publishedAt: Joi.string().required()
        }).unknown(true)
    ).required(),

    "Search Perfumes": Joi.object({
        items: Joi.array().required(),
        totalCount: Joi.number().integer().min(0).required()
    }).required().unknown(true),

    "Autocomplete": Joi.object({
        perfumes: Joi.array().required(),
        brands: Joi.array().optional()
    }).required().unknown(true),

    "Get Perfume Comments": Joi.array().required(),

    // Parfüm yolu "cinsiyet/[konsantrasyon/]marka/parfüm" biçimindedir; dil ön eki
    // (/tr) ve baştaki "/" API'de yoktur, ön yüz ekler.
    "Get Sitemap": Joi.object({
        perfumes: Joi.array().min(1).items(Joi.object({
            path: Joi.string().pattern(/^(erkek|kadin|unisex)(\/[a-z0-9-]+){2,3}$/).required(),
            updatedAt: Joi.date().iso().required()
        })).required(),
        brands: Joi.array().min(1).items(Joi.object({
            slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
            updatedAt: Joi.date().iso().required()
        })).required(),
        blogs: Joi.array().items(Joi.object({
            slug: Joi.string().required(),
            updatedAt: Joi.date().iso().required()
        })).required()
    }).required(),

    "Get Contact Form Token": Joi.object({
        token: Joi.string().min(20).required()
    }).required(),

    "Admin Contact Messages": Joi.object({
        items: Joi.array().items(Joi.object({
            id: Joi.number().integer().required(),
            name: Joi.string().required(),
            email: Joi.string().required(),
            message: Joi.string().required(),
            isRead: Joi.boolean().required(),
            createdAt: Joi.string().required()
        }).unknown(true)).required(),
        unreadCount: Joi.number().integer().min(0).required(),
        total: Joi.number().integer().min(0).required()
    }).required(),

    "Get Advisor Status": Joi.object({
        success: Joi.boolean().required(),
        hasUsedToday: Joi.boolean().required()
    }).required().unknown(true),

    "Get Perfume Recommendation": Joi.object({
        success: Joi.boolean().required(),
        hasUsedToday: Joi.boolean().required(),
        perfume: Joi.object({
            id: Joi.number().integer().required(),
            name: Joi.string().required(),
            slug: Joi.string().required(),
            brandName: Joi.string().required(),
            path: Joi.string().required()
        }).required().unknown(true),
        perfumerAdvice: Joi.string().min(10).required()
    }).required().unknown(true)
};

module.exports = {
    responseValidationSchemes
};
