// ── Environment Configuration ──
const ENV = process.env.TEST_ENV || 'dev';

const ENVIRONMENTS = {
    dev: {
        BASE_URL: process.env.API_BASE_URL || 'http://localhost:5026'
    },
    staging: {
        BASE_URL: process.env.API_BASE_URL || 'https://staging.auracompare.com'
    },
    prod: {
        BASE_URL: process.env.API_BASE_URL || 'https://auracompare.com'
    }
};

const currentEnv = ENVIRONMENTS[ENV];
if (!currentEnv) {
    throw new Error(`Unknown environment: ${ENV}. Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
}

// ── Auth ──
const AUTH = {
    DEV_USER_NAME: process.env.AUTH_DEV_NAME || 'Test Kullanici',
    DEV_USER_EMAIL: process.env.AUTH_DEV_EMAIL || 'test.user@aura.local'
};

// ── API Endpoints ──
const apiEndpoints = (perfumeSlug = null, brandSlug = null, blogSlug = null, query = '') => {
    return {
        // ── Auth ──
        "Auth": {
            "GET": {
                "Me": '/api/auth/me',
            },
            "POST": {
                "Dev Login": '/api/auth/dev-login',
                "Google Login": '/api/auth/google',
                "Facebook Login": '/api/auth/facebook',
            }
        },

        // ── Catalog ──
        "Catalog": {
            "GET": {
                "Get Perfumes": '/api/perfumes',
                "Get Perfumes Random": '/api/perfumes?sort=random&pageSize=10',
                "Get Perfume Detail": `/api/perfumes/${perfumeSlug}`,
                "Get Perfume Comments": `/api/perfumes/${perfumeSlug}/comments`,
                "Get Perfume My Evaluation": `/api/perfumes/${perfumeSlug}/my-evaluation`,
                "Get Brands": '/api/brands',
                "Get Random Brands": '/api/brands/random?count=10',
                "Get Brand Detail": `/api/brands/${brandSlug}`,
                "Get Filter Meta": '/api/meta/filters',
                "Get Perfumes User Filter": `/api/perfumes?userFilter=${query || 'favorites'}`,
                "Get Perfumes Huge Page": '/api/perfumes?page=2147483647',
                "Get Perfumes Random Pool": '/api/perfumes?sort=votes&randomPool=500&pageSize=1',
                "Get Perfume Photos": `/api/perfumes/${perfumeSlug}/photos`,
            },
            "POST": {
                "Submit Perfume Comment": `/api/perfumes/${perfumeSlug}/comments`,
                "Submit Perfume Review": `/api/perfumes/${perfumeSlug}/review`,
                "Record Usage": `/api/perfumes/${perfumeSlug}/kullaniyorum`,
                "Toggle Favorite": `/api/perfumes/${perfumeSlug}/favorite`,
                "Record Perfume View": `/api/perfumes/${perfumeSlug}/view`,
                "Upload Perfume Photo": `/api/perfumes/${perfumeSlug}/photos`,
            }
        },

        // ── Admin ──
        "Admin": {
            "GET": {
                "Admin Seed Status": '/api/admin/seed',
            },
            "POST": {
                "Admin AI Summaries": '/api/admin/ai-summaries',
            }
        },

        // ── Media (static files) ──
        "Media": {
            "GET": {
                "Media Raw JSON": '/media/validation_report.json',
                "Media Brand JSON": '/media/brands/dior_fragrantica_tr.json',
                "Media Perfume Image": '/media/perfumes/dior/images/addict_peachy_glow_eau_de_parfum_121566.webp',
            }
        },

        // ── Compare ──
        "Compare": {
            "GET": {
                "Get Popular Comparisons": '/api/compare/popular',
                "Get AI Comparison Analysis": '/api/compare/dior-sauvage-vs-versace-versace-pour-homme-dylan-blue/ai-analysis',
                "Get Comparison Votes": '/api/compare/dior-sauvage-vs-versace-versace-pour-homme-dylan-blue/votes',
            },
            "POST": {
                "Cast Comparison Vote": '/api/compare/dior-sauvage-vs-versace-versace-pour-homme-dylan-blue/votes',
                "Submit Comparison Comment": '/api/compare/dior-sauvage-vs-versace-versace-pour-homme-dylan-blue/comments',
            }
        },

        // ── Blog ──
        "Blog": {
            "GET": {
                "Get Blogs": '/api/blogs',
                "Get Blog Detail": `/api/blogs/${blogSlug}`,
                "Get Pending Blogs": '/api/blogs/pending',
            },
            "POST": {
                "Create Blog Post": '/api/blogs',
            }
        },

        // ── Sitemap ──
        "Sitemap": {
            "GET": {
                "Get Sitemap": '/api/sitemap',
            }
        },

        // ── Search ──
        "Search": {
            "GET": {
                "Search Perfumes": `/api/search?q=${encodeURIComponent(query !== null && query !== undefined ? query : 'sauvage')}`,
                "Autocomplete": `/api/search/autocomplete?q=${encodeURIComponent(query !== null && query !== undefined ? query : 'dior')}`,
                "Autocomplete With NUL": '/api/search/autocomplete?q=ab%00',
                "Search With Many Words": `/api/search?q=${Array.from({ length: 20 }, (_, i) => `kelime${i}`).join('+')}`,
            }
        },

        // ── Perfume Advisor ──
        "Perfume Advisor": {
            "GET": {
                "Get Advisor Status": '/api/perfume-advisor/status',
            },
            "POST": {
                "Get Perfume Recommendation": '/api/perfume-advisor/recommend',
            }
        },

        // ── Security ──
        "Security": {
            "GET": {
                "Client Header Check": '/api/security/client-header-check',
                "Rate Limit Check": '/api/security/rate-limit-check',
                "Get AntiForgery Token": '/api/security/antiforgery-token',
            },
            "POST": {
                "Verify AntiForgery Token": '/api/security/antiforgery-check',
            }
        }
    };
};

// Resolves an endpoint URL by name (deep search through all groups)
function resolveEndpoint(name, perfumeSlug = null, brandSlug = null, blogSlug = null, query = '') {
    const endpoints = apiEndpoints(perfumeSlug, brandSlug, blogSlug, query);
    for (const group of Object.values(endpoints)) {
        for (const methods of Object.values(group)) {
            if (typeof methods === 'object' && methods[name]) return methods[name];
        }
    }
    throw new Error(`Endpoint "${name}" not found`);
}

module.exports = {
    ENV,
    BASE_URL: currentEnv.BASE_URL,
    AUTH,
    apiEndpoints,
    resolveEndpoint,

    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },

    TIMEOUTS: {
        request: 30000,
        response: 30000
    }
};
