const os = require('os');
const path = require('path');
const logger = require('./logging');

const JEMSTEP_DOMAIN = 'jemstep.com';

const constants = {
    FIREFOX_PROFILES_DIR: path.resolve(os.homedir(), 'Library/Application Support/Firefox/Profiles'),
    FIREFOX_COOKIES_DB: 'cookies.sqlite',
    BROWSER: 'firefox',
    JEMSTEP_DOMAIN,
    LOGIN_URL: `http://ci.${JEMSTEP_DOMAIN}:8153/go/auth/login`,
    DASHBOARD_URL: `http://ci.${JEMSTEP_DOMAIN}:8153/go/pipelines`,
    FIREFOR_COOKIES_DB_TABLE: 'moz_cookies'
};

module.exports = constants;