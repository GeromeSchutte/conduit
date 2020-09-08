const logging = require('./logging');
const { logMethod, logger } = logging;

const sitterStarted = () => {
    const methodId = logMethod(sitterStarted.name, {});
    Creche.activeSitters += 1;
    logger.trace(`[${methodId}] Added active sitter. Active sitters: ${Creche.activeSitters}`);
};

const sitterStopped = () => {
    const methodId = logMethod(sitterStopped.name, {});
    Creche.activeSitters -= 1;
    logger.trace(`[${methodId}] Stopped active sitter. Active sitters: ${Creche.activeSitters}`);
};

const quit = async () => {
    const methodId = logMethod(quit.name, {});

    logger.trace(`[${methodId}] Waiting for all sitters to stop`);
    await new Promise((resolve) => {
        const timeoutLoop = () => {
            if (Creche.activeSitters > 0) {
                setTimeout(timeoutLoop, 1000);
            } else {
                resolve();
            }
        };
        
        setTimeout(timeoutLoop, 1000);
    });
    logger.trace(`[${methodId}] All sitters stopped. Creche quitting`);
};

const Creche = {
    activeSitters: 0,
    sitterStarted,
    sitterStopped,
    quit
};

module.exports = Creche;