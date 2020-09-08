const selenium = require('selenium-webdriver');
const { until, By } = selenium;
const constants = require('./constants');
const cookies = require('./cookies');
const { getCookies } = cookies;
const driverUtil = require('./driverUtil');
const { getDriver, getElementOnceLocated } = driverUtil;
const moment = require('moment');
const { withDriver } = require('./driverUtil');
const logging = require('./logging');
const { logger, logMethod } = logging;
const Creche = require('./creche');
const { sitterStopped } = require('./creche');

/**
 * @enum {number}
 * @readonly
 */
const RerunStrategy = {
    RERUN_STAGE: 0,
    RERUN_PIPELINE: 1
};

/**
 * @param {selenium.WebDriver} driver 
 */
const setup = async (driver) => {
    const methodId = logMethod(setup.name, { driver });

    logger.debug(`[${methodId}] Asserting that Go is logged in`);
    await assertGoIsLoggedIn(driver);

    logger.debug(`[${methodId}] Navigating to '${constants.DASHBOARD_URL}'`);
    await driver.get(constants.DASHBOARD_URL);

    await driver.wait(until.elementLocated(By.className('dashboard-tabs')));
    await driver.executeScript('document.querySelector(\'.dashboard-tabs\').style.display = \'none\'');
}

const localTimeString = () => {
    const now = moment();
    return `on ${now.format('D MMM, YYYY')}`;
};

/**
 * 
 * @param {string} str1 
 * @param {string} str2 
 */
const subtractStrings = (str1, str2) => {
    logMethod(subtractStrings.name, { str1, str2 });

    const startIndex = str1.indexOf(str2);
    const endIndex = startIndex + str2.length;
    return `${str1.substring(0, startIndex)}${str1.substring(endIndex)}`;
};

/**
 * @param {selenium.WebDriver} driver 
 */
const assertGoIsLoggedIn = async (driver) => {
    const methodId = logMethod(assertGoIsLoggedIn.name, { driver });

    logger.trace(`[${methodId}] Navigating to '${constants.DASHBOARD_URL}'`);
    await driver.get(constants.DASHBOARD_URL);
    logger.trace(`[${methodId}] Waiting until page title starts with 'Dashboard' or 'Login'`);
    await driver.wait(until.titleMatches(/^(Dashboard|Login)/), 1000);

    let currentURL = await driver.getCurrentUrl();
    logger.debug(`[${methodId}] Current URL is '${currentURL}'`);

    if (currentURL === constants.LOGIN_URL) {
        logger.debug(`[${methodId}] Current URL is login URL. Will now attempt to add cookies to browser`);
        const cookies = await getCookies();

        for (const cookie of cookies) {
            logger.trace(`[${methodId}] Adding cookie: ${cookie}`);
            await driver.manage().addCookie(cookie);
            logger.trace(`[${methodId}] Cookie added`);
        }

        logger.trace(`[${methodId}] Navigating to '${constants.DASHBOARD_URL}'`);
        await driver.get(constants.DASHBOARD_URL);

        logger.trace(`[${methodId}] Waiting until page title starts with 'Dashboard' or 'Login'`);
        await driver.wait(until.titleMatches(/^(Dashboard|Login)/), 1000);

        currentURL = await driver.getCurrentUrl();
        logger.debug(`[${methodId}] Current URL is '${currentURL}'`);
    }

    if (currentURL === constants.LOGIN_URL) {
        logger.fatal(`[${methodId}] Not logged into Go on ${constants.BROWSER}`);
        throw `Please login to Go on ${constants.BROWSER} before continuing`;
    } else {
        logger.debug(`[${methodId}] Logged into Go successfully`);
    }
};

/**
 * @param {string} subject
 */
const xPathLowerCase = (subject) => {
    return `translate(${subject}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')`;
};

/**
 * @param {selenium.WebDriver} driver
 * @param {string} branchName 
 */
const createPipelinesForBranchname = async (driver, branchName, runSetup = true) => {
    const methodId = logMethod(createPipelinesForBranchname.name, { driver, branchName, runSetup });

    const XPaths = {
        configureFeatureBranchPlayWithOptions: "//h3[contains(text(), 'ConfigureFeatureBranchBuild')]/ancestor::div[@class='pipeline_header']//button[contains(@class, 'play_with_options')]",
        environmentVariables: "//div[contains(@class, 'new-modal-container')]//li[contains(text(), 'Environment variables')]",
        branch: "//dt[@class='name' and contains(text(), 'Branch')]/following-sibling::dd/input",
        triggerPipeline: "//div[contains(@class, 'new-modal-container')]//button[contains(text(), 'Trigger Pipeline')]"
    }

    if (runSetup) {
        await setup(driver);
    }
    
    logger.trace(`[${methodId}] Finding ConfigureFeatureBranchBuild play-with-options button`);

    //Click on ConfigureFeatureBranchBuild > Play, with options
    const configureFeatureBranchBuildButton = await getElementOnceLocated(driver, XPaths.configureFeatureBranchPlayWithOptions);

    logger.trace(`[${methodId}] Found ConfigureFeatureBranchBuild play-with-options button`);
    logger.trace(`[${methodId}] Clicking ConfigureFeatureBranchBuild play-with-options button`)

    await configureFeatureBranchBuildButton.click();

    logger.debug(`[${methodId}] Clicked ConfigureFeatureBranchBuild play-with-options button`);

    /* should maybe also select latest revision */
    
    //Click on Environment variables tab
    logger.trace(`[${methodId}] Finding Environment variables tab`);
    const environmentVariablesTab = await getElementOnceLocated(driver, XPaths.environmentVariables);
    logger.trace(`[${methodId}] Found Environment variables tab`);
    logger.trace(`[${methodId}] Clicking Environment variables tab`);
    await environmentVariablesTab.click();

    logger.debug(`[${methodId}] Clicked Environment variables tab`);

    //Enter the branch name
    logger.trace(`[${methodId}] Finding Branch name input`);
    const branchInput = await getElementOnceLocated(driver, XPaths.branch);
    logger.trace(`[${methodId}] Found Branch name input`);
    logger.trace(`[${methodId}] Typing in Branch name input`);
    await branchInput.sendKeys(branchName);
    logger.debug(`[${methodId}] Typed '${branchName}' Branch name input`);

    //Trigger pipeline
    logger.trace(`[${methodId}] Finding Trigger pipeline button`);
    const triggerPipelineButton = await getElementOnceLocated(driver, XPaths.triggerPipeline);
    logger.trace(`[${methodId}] Found Trigger pipeline button`);
    logger.trace(`[${methodId}] Clicking Trigger pipeline button`);
    await triggerPipelineButton.click();
    logger.trace(`[${methodId}] Clicked Trigger pipeline button`);
};

/**
 * 
 * @param {selenium.WebDriver} driver 
 * @param {string} branchName
 * @returns {Promise<string>} 
 */
const getInstanceNumberForBranchName = async (driver, branchName, runSetup = true) => {
    const methodId = logMethod(getInstanceNumberForBranchName.name, { driver, branchName, runSetup });

    const XPaths = {
        buildSeHeading: `//h3[contains(text(), 'BuildSE') and contains(${xPathLowerCase("text()")}, '${branchName.toLowerCase()}')]`
    };

    if (runSetup) {
        await setup(driver);
    }

    //Get instance number
    logger.trace(`[${methodId}] Finding buildSE pipeline heading`);
    const buildSEHeader = await getElementOnceLocated(driver, XPaths.buildSeHeading);
    logger.trace(`[${methodId}] Found buildSE pipeline heading`);
    const headingText = await buildSEHeader.getText();
    logger.debug(`[${methodId}] BuildSE pipeline heading text: '${headingText}'`);
    
    const unnecessaryPart = `BuildSE-${branchName}-`;
    logger.trace(`[${methodId}] Subtracting '${unnecessaryPart}' from heading text`);
    const instanceNumber = subtractStrings(headingText, unnecessaryPart);

    logger.debug(`[${methodId}] Instance number is: ${instanceNumber}`)
    return instanceNumber;
};

/**
 * 
 * @param {selenium.WebDriver} driver 
 * @param {string} instanceNumber 
 */
const getPipelinesForBranchName = async (driver, branchName, runSetup = true) => {
    const methodId = logMethod(getPipelinesForBranchName.name, { driver, branchName, runSetup });

    if (runSetup) {
        await setup(driver);
    }

    logger.trace(`[${methodId}] Getting instance number for branchname: ${branchName}`);

    const instanceNumber = await getInstanceNumberForBranchName(driver, branchName, false);

    const XPaths = {
        pipeline: `//h3[contains(text(), '${instanceNumber}')]`
    };

    const pipelineLocator = By.xpath(XPaths.pipeline);

    logger.trace(`[${methodId}] Waiting until pipeline heading is located`);
    await driver.wait(until.elementLocated(pipelineLocator));
    logger.trace(`[${methodId}] Located pipeline heading`);
    logger.trace(`[${methodId}] Finding pipeline heading elements`);
    const pipelineHeadingElements = await driver.findElements(pipelineLocator);
    logger.debug(`[${methodId}] Found pipeline heading elements: ${pipelineHeadingElements}`);
    const pipelineHeadings = [];

    logger.trace(`[${methodId}] Mapping pipeline heading elements to pipeline headings`);
    for (const pipelineHeadingElement of pipelineHeadingElements) {
        const pipelineHeadingFull = await pipelineHeadingElement.getText();
        const pipelineHeadingShortened = subtractStrings(pipelineHeadingFull, `-${branchName}-${instanceNumber}`);
        logger.debug(`[${methodId}] Pipeline heading from '${pipelineHeadingShortened}' is: ${pipelineHeadingShortened}`);
        pipelineHeadings.push(pipelineHeadingShortened);
    }

    logger.debug(`[${methodId}] Pipeline headings: ${pipelineHeadings}`);
    return pipelineHeadings;
};

/**
 * 
 * @param {selenium.WebDriver} driver 
 * @param {string} pipelineName not case sensitive 
 * @param {string} instanceNumber 
 * @param {string} [minCompletionStage] not case sensitive, min stage to reach before pipeline is regarded as complete
 */
const runPipelineForInstance = async (driver, pipelineName, instanceNumber, minCompletionStage, runSetup = true) => {
    const methodId = logMethod(runPipelineForInstance.name, { driver, pipelineName, instanceNumber, minCompletionStage, runSetup });

    const XPaths = {
        pipelinePlay: `//h3[contains(${xPathLowerCase('text()')}, '${pipelineName.toLowerCase()}') and contains(text(), '${instanceNumber}')]/ancestor::div[@class='pipeline_header']//button[@title='Trigger Pipeline']`
    };

    if (runSetup) {
        await setup(driver);
    }

    logger.trace(`[${methodId}] Finding pipeline play button`);
    const pipelinePlayButton = await getElementOnceLocated(driver, XPaths.pipelinePlay);
    logger.trace(`[${methodId}] Found pipeline play button`);
    logger.trace(`[${methodId}] Clicking pipeline play button`);
    await pipelinePlayButton.click();
    logger.debug(`[${methodId}] Clicked pipeline play button for pipeline '${pipelineName}' on instance '${instanceNumber}'`);

    if (typeof minCompletionStage !== 'undefined') {
        logger.trace(`[${methodId}] Min completion stage is set to '${minCompletionStage}'. Waiting for stage to complete`);
        await awaitStageCompletionForPipelineForInstance(driver, pipelineName, instanceNumber, minCompletionStage, false);
        logger.trace(`[${methodId}] Min completion stage '${minCompletionStage}' completed`);
    }
};

/**
 * 
 * @param {selenium.WebDriver} driver 
 * @param {string} pipelineName not case sensitive 
 * @param {string} instanceNumber 
 * @param {string} stage not case sensitive, stage to reach before pipeline is regarded as complete
 */
const awaitStageCompletionForPipelineForInstance = async (driver, pipelineName, instanceNumber, stage, runSetup = true) => {
    const methodId = logMethod(awaitStageCompletionForPipelineForInstance.name, { driver, pipelineName, instanceNumber, stage, runSetup });

    const XPaths = {
        stageSuccess: `//div[contains(text(), '${localTimeString()}')]/ancestor::div[@class = 'pipeline']//h3[contains(${xPathLowerCase('text()')}, '${pipelineName.toLowerCase()}') and contains(text(), '${instanceNumber}')]/ancestor::div[@class='pipeline']//a[@class='pipeline_stage passed' and contains(${xPathLowerCase('@title')}, '${stage.toLowerCase()}')]`
    };

    if (runSetup) {
        await setup(driver);
    }

    logger.trace(`[${methodId}] Waiting until stage '${stage}' is completed`);
    await driver.wait(until.elementLocated(By.xpath(XPaths.stageSuccess)));
    logger.trace(`[${methodId}] Stage '${stage}' completed`);
};

/**
 * @typedef Babysitter
 * @type {object} 
 * @property {number} delayBeforeRerun Seconds to wait before a rerun occurs
 * @property {RerunStrategy} rerunStrategy
 */

/**
 * @typedef Pipeline
 * @type {object}
 * @property {string} pipelineName
 * @property {string=} minimumCompletionStage
 * @property {string=} completionStage
 * @property {Babysitter=} babySitter
 */

/**
 * @param {selenium.WebDriver} driver
 * @param {string} instanceNumber 
 * @param {(Pipeline[]|Pipeline[][])} pipelineSequence 
 */

const runPipelineSequenceForInstance = async (driver, instanceNumber, pipelineSequence, runSetup = true) => {
    const methodId = logMethod(runPipelineSequenceForInstance.name, { driver, instanceNumber, pipelineSequence, runSetup });

    if (runSetup) {
        await setup(driver);
    }

    logger.trace(`[${methodId}] Running each pipeline step in the pipeline sequence`);
    for (const pipelineStep of pipelineSequence) {
        if (!Array.isArray(pipelineStep)) {
            logger.trace(`[${methodId}] Starting babysitter for '${pipelineStep.pipelineName}'`);
            Creche.sitterStarted();
            babySitPipelineForInstance(driver, instanceNumber, pipelineStep, false);
            logger.trace(`[${methodId}] Babysitter started for '${pipelineStep.pipelineName}'`);
            logger.debug(`[${methodId}] Running pipeline '${pipelineStep.pipelineName}'`);
            await runPipelineForInstance(driver, pipelineStep.pipelineName, instanceNumber, pipelineStep.minimumCompletionStage, false);
            logger.trace(`[${methodId}] Pipeline '${pipelineStep.pipelineName}' finished`);
        } else {
            logger.trace(`[${methodId}] Step is an array. Running pipelines in parallel`);
            const parallelPipelines = pipelineStep.map( async p => {
                logger.trace(`[${methodId}] Starting babysitter for '${pipelineStep.pipelineName}'`);
                Creche.sitterStarted();
                babySitPipelineForInstance(driver, instanceNumber, p, false);
                logger.trace(`[${methodId}] Babysitter started for '${pipelineStep.pipelineName}'`);
                logger.debug(`[${methodId}] Running pipeline '${pipelineStep.pipelineName}'`);
                await runPipelineForInstance(driver, p.pipelineName, instanceNumber, p.minimumCompletionStage, false);
                logger.trace(`[${methodId}] Pipeline '${pipelineStep.pipelineName}' finished`);
            } );
            await Promise.all(parallelPipelines);
            logger.trace(`[${methodId}] Parallel pipelines finished`);
        }
    }
};

/**
 * @param {selenium.WebDriver} driver
 * @param {string} instanceNumber 
 * @param {string} pipelineName
 * @param {string} stage
 */

const retriggerStageForPipelineForInstance = async (driver, instanceNumber, pipelineName, stage, runSetup = true) => {
    const methodId = logMethod(retriggerStageForPipelineForInstance.name, { driver, instanceNumber, pipelineName, stage, runSetup });

    if (runSetup) {
        await setup(driver);
    }

    const XPaths = {
        stageFailed: `//h3[contains(${xPathLowerCase('text()')}, '${pipelineName.toLowerCase()}') and contains(text(), '${instanceNumber}')]/ancestor::div[@class='pipeline']//a[@class='pipeline_stage failed' and contains(${xPathLowerCase('@title')}, '${stage.toLowerCase()}')]`,
        jobsTab: `//li/a[contains(text(), 'Jobs')]`,
        rerunFailed: `//span[contains(text(), 'RERUN FAILED')]/ancestor::button`
    };

    logger.trace(`[${methodId}] Finding stage link '${stage}'`);
    const stageLink = await getElementOnceLocated(driver, XPaths.stageFailed);
    logger.trace(`[${methodId}] Found stage link`);
    logger.trace(`[${methodId}] Clicking stage link`);
    await stageLink.click();
    logger.debug(`[${methodId}] Stage link '${stage}' clicked`);

    logger.trace(`[${methodId}] Waiting until title contains 'Stage Detail'`);
    await driver.wait(until.titleContains('Stage Detail'));
    logger.debug(`[${methodId}] Title contains 'Stage Detail'`);

    logger.trace(`[${methodId}] Finding jobs tab`);
    const jobsTab = await getElementOnceLocated(driver, XPaths.jobsTab);
    logger.trace(`[${methodId}] Found jobs tab`);
    logger.trace(`[${methodId}] Clicking jobs tab`);
    await jobsTab.click();
    logger.trace(`[${methodId}] Jobs tab clicked`);

    logger.trace(`[${methodId}] Finding rerun failed button`);
    const rerunFailedButton = await getElementOnceLocated(driver, XPaths.rerunFailed);
    logger.trace(`[${methodId}] Found rerun failed button`);
    logger.trace(`[${methodId}] Clicking rerun failed button`);
    await rerunFailedButton.click();
    logger.trace(`[${methodId}] Rerun failed button clicked`);
};

const afterSecondsDo = async (seconds, func) => {
    const methodId = logMethod(afterSecondsDo.name, { seconds, func });

    logger.trace(`[${methodId}] waiting ${seconds} seconds`);
    await new Promise((resolve) => {
        setTimeout(resolve, seconds*1000);
    });

    logger.debug(`[${methodId}] ${seconds} seconds elapsed`);
    logger.trace(`[${methodId}] Calling function`);
    await func();
    logger.debug(`[${methodId}] Function finished`);
};

/**
 * @param {selenium.WebDriver} driver
 * @param {string} instanceNumber 
 * @param {string} pipelineName
 */

const getStagesForPipelineForInstance = async (driver, instanceNumber, pipelineName, runSetup = true) => {
    const methodId = logMethod(getStagesForPipelineForInstance.name, { driver, instanceNumber, pipelineName, runSetup });
    
    if (runSetup) {
        await setup(driver);
    }

    const XPaths = {
        stage: `//h3[contains(${xPathLowerCase('text()')}, '${pipelineName.toLowerCase()}') and contains(text(), '${instanceNumber}')]/ancestor::div[@class='pipeline']//.[contains(@class, 'pipeline_stage ')]`
    };

    logger.trace(`[${methodId}] Waiting until stage element is located`);
    const stageLocator = By.xpath(XPaths.stage);
    await driver.wait(until.elementLocated(stageLocator));
    logger.trace(`[${methodId}] Stage element is located`);

    logger.trace(`[${methodId}] Finding stage elements`);
    const stageElements = await driver.findElements(stageLocator);
    logger.debug(`[${methodId}] Stage elements found: ${stageElements}`);
    logger.trace(`[${methodId}] Mapping stage elements to stages`);
    const stages = await Promise.all( stageElements.map( async stageElement => {
        const stageName = await stageElement.getAttribute('title');

        return stageName.toLowerCase();
    } ));

    logger.debug(`[${methodId}] Stages: ${stages}`);
    return stages;
};

/**
 * 
 * @param {selenium.WebDriver} driver 
 * @param {string} instanceNumber 
 * @param {Pipeline} pipelineOptions 
 * @param {boolean} runSetup 
 */

const babySitPipelineForInstance = async (driver, instanceNumber, pipelineOptions, runSetup = true) => {
    const methodId = logMethod(babySitPipelineForInstance.name, { driver, instanceNumber, pipelineOptions, runSetup });

    if (runSetup) {
        await setup(driver);
    }

    logger.trace(`[${methodId}] Getting stages for pipeline '${pipelineOptions.pipelineName}'`);
    const stages = await getStagesForPipelineForInstance(driver, instanceNumber, pipelineOptions.pipelineName, false);
    const lastPerformedStageIndex = pipelineOptions.completionStage ? stages.findIndex(s => s.startsWith(pipelineOptions.completionStage.toLowerCase())) : stages.length - 1;
    logger.debug(`[${methodId}] Index of last performed stage: ${lastPerformedStageIndex}`);
    logger.trace(`[${methodId}] Cropping stages array length to ${lastPerformedStageIndex + 1}`);
    stages.length = lastPerformedStageIndex + 1;

    logger.debug(`[${methodId}] Cropped stages array: ${stages}`);
    const firstNotPassedStage = stages.find(stage => !stage.endsWith('(passed)'));
    logger.debug(`[${methodId}] First stage not passed: ${firstNotPassedStage}`);

    if (firstNotPassedStage || stages.length === 0) {
        if (firstNotPassedStage.endsWith('(failed)')) {

            const strategy = pipelineOptions.babySitter.rerunStrategy === RerunStrategy.RERUN_PIPELINE ? 'RERUN_PIPELINE' : 'RERUN_STAGE';

            logger.debug(`[${methodId}] First stage not passed was a failed stage. Rerun strategy: ${strategy}`);
            await afterSecondsDo(pipelineOptions.babySitter.delayBeforeRerun, async () => {
                await withDriver(async (babysitterDriver) => {
                    const babySitterMethodId = logMethod('anonBabysitter', { babysitterDriver });
                    if (pipelineOptions.babySitter.rerunStrategy === RerunStrategy.RERUN_PIPELINE) {
                        logger.debug(`[${babySitterMethodId}] Babysitter rerunning pipeline '${pipelineOptions.pipelineName}'`)
                        await runPipelineForInstance(babysitterDriver, pipelineOptions.pipelineName, instanceNumber);
                    } else if (pipelineOptions.babySitter.rerunStrategy === RerunStrategy.RERUN_STAGE) {
                        logger.debug(`[${babySitterMethodId}] Babysitter rerunning stage '${firstNotPassedStage}'`);
                        await retriggerStageForPipelineForInstance(babysitterDriver, instanceNumber, pipelineOptions.pipelineName, firstNotPassedStage);
                    }
                    logger.trace(`[${babySitterMethodId}] Babysitter rerun finished`);
                });
            });
        }

        logger.trace(`[${methodId}] Not passed stages exist. Waiting 10 seconds and checking again`);
        await afterSecondsDo(10, async () => {
            await babySitPipelineForInstance(driver, instanceNumber, pipelineOptions, false);
        });
    } else {
        Creche.sitterStopped();
    }
};

module.exports = {
    RerunStrategy,
    localTimeString,
    assertGoIsLoggedIn,
    createPipelinesForBranchname,
    getInstanceNumberForBranchName,
    getPipelinesForBranchName,
    runPipelineForInstance,
    awaitStageCompletionForPipelineForInstance,
    runPipelineSequenceForInstance,
    retriggerStageForPipelineForInstance,
    getStagesForPipelineForInstance,
    babySitPipelineForInstance
};