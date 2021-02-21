import Debug from 'debug';
import * as sourceMapSupport from 'source-map-support';

export const debug = Debug('easymde-demo');

import { Application } from './controllers/application.controller';

function start() {
    sourceMapSupport.install();

    const application = new Application();

    // Ensure application shuts down gracefully at all times.
    process.stdin.resume();
    process.on('uncaughtException', (error: Error) => {
        process.stderr.write(`Uncaught Exception! \n${error}\n`);
        application.stop(error).then();
    });
    process.on('SIGINT', () => {
        application.stop().then();
    });
    process.on('SIGTERM', () => {
        application.stop().then();
    });
    // Promises that fail should not cause the application to stop, instead we log the error.
    process.on('unhandledRejection', (reason, p): void => {
        process.stderr.write(`Unhandled Rejection at: \nPromise ${p} \nReason: ${reason}\n`);
    });

    application.start().then().catch((error: Error) => application.stop(error));
}

// Prevent file from running when importing from it.
if (require.main === module) {
    start();
}
