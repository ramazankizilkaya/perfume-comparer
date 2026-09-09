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

    "Get Blogs": Joi.array().items(
        Joi.object({
            id: Joi.number().integer().required(),
            title: Joi.string().required(),
            slug: Joi.string().required(),
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

    "Get Perfume Comments": Joi.array().required()
};

module.exports = {
    responseValidationSchemes
};
