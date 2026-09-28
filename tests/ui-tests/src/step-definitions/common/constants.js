const BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5026';

const SCREEN_SIZES = {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 375, height: 812 }
};

const PAGES = {
    'Home': '/tr',
    'Detailed Search': '/tr/detayli-arama',
    'Brands': '/tr/marka',
    'Compare': '/tr/karsilastir',
    'Blog': '/tr/blog',
    'My Articles': '/tr/blog/yazilarim',
    'Login': '/tr/giris',
    'Admin': '/tr/admin',
    'Sample Perfume': '/tr/parfum/erkek/edp/dior/dior-sauvage-edp',
    'Sample Brand': '/tr/marka/afnan'
};

const TIMEOUTS = {
    short: 3000,
    medium: 10000,
    long: 30000
};

module.exports = {
    BASE_URL,
    API_BASE_URL,
    SCREEN_SIZES,
    PAGES,
    TIMEOUTS
};
