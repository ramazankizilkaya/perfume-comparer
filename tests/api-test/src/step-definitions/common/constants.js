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
            }
        },

        // ── Catalog ──
        "Catalog": {
            "GET": {
                "Get Perfumes": '/api/perfumes',
                "Get Perfumes Random": '/api/perfumes?sort=random&pageSize=10',
                "Get Perfume Detail": `/api/perfumes/${perfumeSlug}`,
                "Get Perfume Comments": `/api/perfumes/${perfumeSlug}/comments`,
                "Get Brands": '/api/brands',
                "Get Random Brands": '/api/brands/random?count=10',
                "Get Brand Detail": `/api/brands/${brandSlug}`,
                "Get Filter Meta": '/api/meta/filters',
            },
            "POST": {
                "Submit Perfume Comment": `/api/perfumes/${perfumeSlug}/comments`,
                "Record Usage": `/api/perfumes/${perfumeSlug}/kullaniyorum`,
            }
        },

        // ── Compare ──
        "Compare": {
            "GET": {
                "Get Popular Comparisons": '/api/compare/popular',
            }
        },

        // ── Blog ──
        "Blog": {
            "GET": {
                "Get Blogs": '/api/blogs',
                "Get Blog Detail": `/api/blogs/${blogSlug}`,
            }
        },

        // ── Search ──
        "Search": {
            "GET": {
                "Search Perfumes": `/api/search?q=${encodeURIComponent(query !== null && query !== undefined ? query : 'sauvage')}`,
                "Autocomplete": `/api/search/autocomplete?q=${encodeURIComponent(query !== null && query !== undefined ? query : 'dior')}`,
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
