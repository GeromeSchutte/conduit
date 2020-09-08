const log4js = require('log4js');
const moment = require('moment');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

const logsFolder = path.resolve(os.homedir(), '.conduit/logs/');
const logfile = path.resolve(logsFolder, `${moment().format('YYYY-MMM-DD HH:mm:ss')}.log`);

const createLogfile = () => {
    fs.mkdirSync(logsFolder, {
        recursive: true
    });
    fs.closeSync(fs.openSync(logfile, 'a'));
};

createLogfile();

const logLevel = process.env['LOGLEVEL'] ? process.env['LOGLEVEL'] : 'trace';

log4js.configure({
    appenders: {
        allLogs: {
            type: 'file',
            filename: logfile
        }
    },
    categories: {
        default: {
            appenders: ['allLogs'],
            level: logLevel
        }
    }
});

const logger = log4js.getLogger();

const logMethod = (methodName, arguments) => {
    const methodId = uuid.v4();
    
    if (arguments.driver) {
        arguments.driver = arguments.driver.conduitDriverId;
    }

    logger.trace(`[${methodId}] *** METHOD '${methodName}' ***`);
    logger.trace(`[${methodId}] *** ARGUMENTS, ${JSON.stringify(arguments)} ***`);

    return methodId;
};

module.exports = {
    logger,
    logMethod
};