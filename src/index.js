const go = require('./go');
const { withDriver } = require('./driverUtil');
const Creche = require('./creche');

console.log(go.localTimeString());

withDriver(async (driver) => {
    const branch = 'PYKE-12960';

    await go.createPipelinesForBranchname(driver, branch);
    const instanceNumber = await go.getInstanceNumberForBranchName(driver, branch);

    const pipelineSequence = [
        {
            pipelineName: 'buildse',
            minimumCompletionStage: 'compileandpackage',
            completionStage: 'destroybuildagents',
            babySitter: {
                delayBeforeRerun: 0,
                rerunStrategy: go.RerunStrategy.RERUN_STAGE
            }
        },
        [
            {
                pipelineName: 'deploydbs',
                minimumCompletionStage: 'deploydatabases',
                babySitter: {
                    delayBeforeRerun: 30,
                    rerunStrategy: go.RerunStrategy.RERUN_PIPELINE
                }
            },
            {
                pipelineName: 'deployapigw',
                minimumCompletionStage: 'createapigw',
                babySitter: {
                    delayBeforeRerun: 0,
                    rerunStrategy: go.RerunStrategy.RERUN_PIPELINE
                }
            }
        ],
        {
            pipelineName: 'deployapps',
            minimumCompletionStage: 'createapp',
            babySitter: {
                delayBeforeRerun: 0,
                rerunStrategy: go.RerunStrategy.RERUN_PIPELINE
            }
        },
        [
            {
                pipelineName: 'updatedns',
                minimumCompletionStage: 'updatedns',
                babySitter: {
                    delayBeforeRerun: 0,
                    rerunStrategy: go.RerunStrategy.RERUN_PIPELINE
                }
            },
            {
                pipelineName: 'updateapi',
                minimumCompletionStage: 'updateapigw',
                babySitter: {
                    delayBeforeRerun: 300,
                    rerunStrategy: go.RerunStrategy.RERUN_PIPELINE
                }
            }
        ],
        {
            pipelineName: 'runat',
            completionStage: 'acceptancetest',
            babySitter: {
                delayBeforeRerun: 0,
                rerunStrategy: go.RerunStrategy.RERUN_STAGE
            }
        }
    ];

    await go.runPipelineSequenceForInstance(driver, instanceNumber, pipelineSequence.slice(1), false);
    await Creche.quit();
}).then(() => {
    console.log('Finished');
});