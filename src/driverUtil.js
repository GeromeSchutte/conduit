const firefox = require('selenium-webdriver/firefox');
const selenium = require('selenium-webdriver');
const { Builder, By, until } = selenium;
const constants = require('./constants');
const logging = require('./logging');
const { logger, logMethod } = logging;
const uuid = require('uuid');

const getDriver = async () => {
    logMethod(getDriver.name, {});

    const driver = await new Builder()
        .forBrowser(constants.BROWSER)
        .setFirefoxOptions(new firefox.Options().headless())
        .build();

    return driver;
};

/**
 * An asynchronous function that receives a selenium webdriver, and resolves void.
 * @callback withDriverFunction
 * @param {selenium.WebDriver} driver 
 * @returns {Promise<void>}
 */

/**
 * A function which abstracts creating and destroying a driver, allowing the caller to provide only functionality which requires a driver
 * @param {withDriverFunction} func 
 */
const withDriver = async (func) => {
    const methodId = logMethod(withDriver.name, { func });

    logger.trace(`[${methodId}] Getting UUID for driver`);
    const driverId = uuid.v4();

    logger.trace(`[${methodId}] Getting driver`);
    const driver = await getDriver();

    driver.conduitDriverId = driverId;

    try {
        logger.debug(`[${methodId}] Driver '${driverId}' started`);
        await func(driver);
    } catch (e) {
        console.error(e);
        logger.fatal(`[${methodId}] Driver '${driverId}' failed: ${e}`);
    } finally {
        logger.trace(`[${methodId}] Driver '${driverId}' quitting`);
        await driver.quit();
        logger.debug(`[${methodId}] Driver '${driverId}' quit`);
    }
}

/**
 * @param {selenium.WebDriver} driver 
 * @param {String} xpath 
 * @param {number} opt_timeout 
 */
const getElementOnceLocated = async (driver, xpath, opt_timeout) => {
    const methodId = logMethod(getElementOnceLocated.name, { driver, xpath, opt_timeout });

    const locator = By.xpath(xpath);
    
    logger.trace(`[${methodId}] Waiting until element is located`);
    await driver.wait(until.elementLocated(locator), opt_timeout);
    logger.trace(`[${methodId}] Element is located`);
    const element = await driver.findElement(locator);
    logger.debug(`[${methodId}] Located element: ${element}`);
    return element;
};

module.exports = {
    getDriver,
    withDriver,
    getElementOnceLocated
};