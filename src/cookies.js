const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const constants = require('./constants');
const logging = require('./logging');
const { logger, logMethod } = logging;

const findActiveProfile = (profilesFolder) => {
    const methodId = logMethod(findActiveProfile.name, { profilesFolder });

    logger.trace(`[${methodId}] Reading '${profilesFolder}' childDirectories`);
    const profileFolders = fs.readdirSync(profilesFolder).filter(child => {
        const filestats = fs.lstatSync(path.resolve(profilesFolder, child));
        return filestats.isDirectory();
    });

    logger.debug(`[${methodId}] Found '${profilesFolder}' child directories: ${profileFolders}`);

    logger.trace(`[${methodId}] Checking each profile for cookies database file '${constants.FIREFOX_COOKIES_DB}'`);
    for (const profile of profileFolders) {
        const pathToProfile = path.resolve(profilesFolder, profile);
        const profileFolderContent = fs.readdirSync(pathToProfile);
        
        if (profileFolderContent.includes(constants.FIREFOX_COOKIES_DB)) {
            logger.debug(`[${methodId}] '${pathToProfile}' contains cookies database file '${constants.FIREFOX_COOKIES_DB}'`);
            return pathToProfile;
        }
        logger.debug(`[${methodId}] '${pathToProfile}' does not contain cookies database file '${constants.FIREFOX_COOKIES_DB}'`);
    }

    logger.error(`[${methodId}] Searched through all profiles in '${constants.FIREFOX_PROFILES_DIR}'. No profile contains cookies database file '${constants.FIREFOX_COOKIES_DB}'`);
    throw 'No firefox profile has any cookies';
};

const pairArrays = (arr1, arr2) => {
    logMethod(pairArrays.name, { arr1, arr2 });

    return arr1.reduce((result, val, index) => {
        return [...result, [val, arr2[index]]];
    }, []);
};

const mapCookies = (cookies) => {
    logMethod(mapCookies.name, { cookies });
    
    return cookies.map(cookie => ({
        ...cookie,
        sameSite: cookie.sameSite === 0 ? 'Lax' : 'Strict'
    }))
};

const getCookies = async () => {
    const methodId = logMethod(getCookies.name, {});

    const activeProfilePath = await findActiveProfile(constants.FIREFOX_PROFILES_DIR);
    logger.trace(`[${methodId}] Path to active profile found: '${activeProfilePath}'`);

    const cookiesDbPath = path.resolve(activeProfilePath, constants.FIREFOX_COOKIES_DB);
    logger.trace(`[${methodId}] Path to cookies database: '${cookiesDbPath}'`);

    const cookiesDbBuffer = await fs.promises.readFile(cookiesDbPath);
    try {
        logger.trace(`[${methodId}] Initializing cookies database object from buffer`);
        const driver = await initSqlJs();
        const cookiesDb = new driver.Database(cookiesDbBuffer);

        logger.trace(`[${methodId}] Cookies database object initialized`);
        const cookiesQuery = `SELECT * FROM '${constants.FIREFOR_COOKIES_DB_TABLE}' WHERE baseDomain = '${constants.JEMSTEP_DOMAIN}'`;
        logger.trace(`[${methodId}] Reading from '${constants.FIREFOR_COOKIES_DB_TABLE}' in cookies database object. Query: '${cookiesQuery}'`);
        const result = cookiesDb.exec(cookiesQuery);
        const columns = result[0].columns;
        const values = result[0].values;

        logger.debug(`[${methodId}] Read from cookies database object. Columns: ${columns}. Values: ${values}`);

        const cookies = mapCookies(values.map(cookieValues => {
            return Object.fromEntries(pairArrays(columns, cookieValues));
        }));

        logger.debug(`[${methodId}] Cookies returned: ${cookies}`);
        return cookies;
    } catch (e) {
        console.error(e);
        logger.error(e);
    }
};

module.exports = {
    getCookies
};