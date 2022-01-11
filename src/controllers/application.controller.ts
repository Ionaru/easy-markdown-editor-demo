import { WebServer } from '@ionaru/web-server';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as hbs from 'hbs';
import * as hbsutils from 'hbs-utils';
import * as helmet from 'helmet';
import * as path from 'path';

import { RequestLogger } from '../loggers/request.logger';
import { ErrorRouter } from '../routes/error.router';
import { GlobalRouter } from '../routes/global.router';
import { HomeRouter } from '../routes/home.router';
import { NotFoundRouter } from '../routes/not-found.router';
import { debug } from '../index';
import { createSassMiddleware } from '../middleware/sass.middleware';

export class Application {

    private static debug = debug.extend('Application');

    private static exit(exitCode: number) {
        Application.debug('Shutting down');
        process.exit(exitCode);
    }

    private webServer?: WebServer;

    private sourceFolder = 'src';
    private assetsFolder = path.join(this.sourceFolder, 'assets');
    private viewsFolder = path.join(this.sourceFolder, 'views');
    private stylesFolder = path.join(this.sourceFolder, 'styles');

    public async start() {
        Application.debug('Beginning Express startup');

        const expressApplication = express();
        Application.debug('Express application constructed');

        // Request logger
        expressApplication.use(RequestLogger.logRequest());

        // Security options
        expressApplication.use(helmet({
            contentSecurityPolicy: false,
        }));
        expressApplication.set('trust proxy', 1);

        // Setup bodyParser
        expressApplication.use(bodyParser.json() as any);
        expressApplication.use(bodyParser.urlencoded({extended: true}) as any);

        expressApplication.use(compression());

        Application.debug('Express configuration set');

        expressApplication.use(createSassMiddleware({
            debug: false,
            prefix: '/stylesheets',
            sourceMap: true,
            src: this.stylesFolder,
        }));
        Application.debug('Style engine setup done');

        // Set up view engine.
        const hbsUtils = hbsutils(hbs);
        expressApplication.set('views', this.viewsFolder);
        expressApplication.set('view engine', 'hbs');
        hbsUtils.registerWatchedPartials(path.join(this.viewsFolder, 'partials'));
        Application.debug('View engine setup done');

        expressApplication.use(express.static(this.assetsFolder));

        if (process.env.NODE_ENV !== 'production') {
            // Serve sources when not in production mode.
            expressApplication.use(express.static(this.sourceFolder));
        }

        // Global router.
        expressApplication.use('*', (new GlobalRouter()).router);

        // Application routers.
        expressApplication.use('/', (new HomeRouter()).router);

        // Error routers.
        expressApplication.use('*', (new NotFoundRouter()).router);
        expressApplication.use(ErrorRouter.errorRoute);

        Application.debug('Express configuration set');

        Application.debug('App startup done');

        const serverPort = process.env.MDE_PORT || 3000;
        this.webServer = new WebServer(expressApplication, Number(serverPort));
        await this.webServer.listen();

        Application.debug(`App listening on port ${serverPort}`);
    }

    public async stop(error?: Error): Promise<void> {
        const exitCode = error ? 1 : 0;

        // Ensure the app exits when there is an exception during shutdown.
        process.on('uncaughtException', () => {
            Application.exit(exitCode);
        });
        process.on('unhandledRejection', (reason, p): void => {
            process.stderr.write(`Unhandled Rejection at: \nPromise ${p} \nReason: ${reason}\n`);
            Application.exit(exitCode);
        });

        let quitMessage = 'Quitting';
        if (error) {
            quitMessage += ' because of an uncaught exception!';
            process.stderr.write(`Reason: ${error}\n`);
        }
        process.emitWarning(quitMessage);

        if (this.webServer) {
            await this.webServer.close();
            Application.debug('HTTP server closed');
        }
        Application.exit(exitCode);
    }
}
