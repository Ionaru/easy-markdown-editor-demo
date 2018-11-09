import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as MySQLStore from 'express-mysql-session';
import * as es from 'express-session';
import * as hbs from 'hbs';
import * as hbsutils from 'hbs-utils';
import * as helmet from 'helmet';
import * as sassMiddleware from 'node-sass-middleware';
import * as path from 'path';
import { logger } from 'winston-pnp-logger';

import { RequestLogger } from '../loggers/request.logger';
import { ErrorRouter } from '../routes/error.router';
import { GlobalRouter } from '../routes/global.router';
import { NotFoundRouter } from '../routes/not-found.router';
import { TestRouter } from '../routes/test.router';
import { config } from './configuration.controller';
import { DatabaseConnection, db } from './database.controller';
import { WebServer } from './server.controller';

export class Application {

    private static exit(exitCode: number) {
        logger.info('Shutting down');
        process.exit(exitCode);
    }

    public sessionStore?: es.Store;
    public sessionParser?: express.RequestHandler;

    private webServer?: WebServer;

    private sourceFolder = 'src';
    private assetsFolder = `${this.sourceFolder}/assets`;
    private nodeModulesFolder = 'node_modules';
    private viewsFolder = `${this.sourceFolder}/views`;
    private stylesheetsFolder = `${this.assetsFolder}/stylesheets`;
    private stylesFolder = `${this.sourceFolder}/styles`;

    public async start() {
        await new DatabaseConnection().connect();

        logger.info('Beginning Express startup');

        const expressApplication = express();
        logger.info('Express application constructed');

        // Request logger
        expressApplication.use(RequestLogger.logRequest());

        // Security options
        expressApplication.use(helmet());
        expressApplication.set('trust proxy', 1);

        // Setup bodyParser
        expressApplication.use(bodyParser.json() as any);
        expressApplication.use(bodyParser.urlencoded({extended: true}) as any);

        expressApplication.use(compression());

        logger.info('Express configuration set');

        // Setup MySQL Session Storage
        this.sessionStore = new MySQLStore({
            schema: {
                columnNames: {
                    data: 'data',
                    expires: 'expires',
                    session_id: 'session_id',
                },
                tableName: 'session',
            },
        }, db.pool) as any;

        // Configure Session Parser
        this.sessionParser = es({
            cookie: {
                httpOnly: false,
                maxAge: 6 * 60 * 60 * 1000, // 6 hours
                secure: config.getProperty('secure_only_cookies', true) as boolean,
            },
            name: config.getProperty('session_key') as string,
            resave: true,
            rolling: true,
            saveUninitialized: true,
            secret: config.getProperty('session_secret') as string,
            store: process.env.NODE_ENV === 'production' ? this.sessionStore : undefined,
        });

        expressApplication.use(this.sessionParser);

        logger.info('Express session store loaded');

        expressApplication.use(sassMiddleware({
            debug: false,
            dest: this.stylesheetsFolder,
            prefix: '/stylesheets',
            sourceMap: true,
            src: this.stylesFolder,
        }));
        logger.info('Style engine setup done');

        // Set up view engine.
        const hbsUtils = hbsutils(hbs);
        expressApplication.set('views', this.viewsFolder);
        expressApplication.set('view engine', 'hbs');
        hbsUtils.registerWatchedPartials(path.join(this.viewsFolder, 'partials'));
        logger.info('View engine setup done');

        // Static resources.
        expressApplication.use(express.static(this.assetsFolder));
        expressApplication.use('/modules', express.static(this.nodeModulesFolder));

        if (process.env.NODE_ENV !== 'production') {
            // Serve sources when not in production mode.
            expressApplication.use(express.static(this.sourceFolder));
        }

        // Global router.
        expressApplication.use('*', (new GlobalRouter()).router);

        // Application routers.
        expressApplication.use('/', (new TestRouter()).router);

        // Error routers.
        expressApplication.use('*', (new NotFoundRouter()).router);
        expressApplication.use(ErrorRouter.errorRoute);

        logger.info('Express configuration set');

        logger.info('App startup done');

        this.webServer = new WebServer(expressApplication);
    }

    public async stop(error?: Error): Promise<void> {
        const exitCode = error ? 1 : 0;
        // Ensure the app exits when there is an exception during shutdown.
        process.on('uncaughtException', () => {
            Application.exit(exitCode);
        });
        process.on('unhandledRejection', (reason: string, p: Promise<any>): void => {
            logger.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
            Application.exit(exitCode);
        });

        let quitMessage = 'Quitting';
        if (error) {
            quitMessage += ' because of an uncaught exception!';
            logger.error('Reason: ', error);
        }
        logger.warn(quitMessage);

        if (this.webServer) {
            this.webServer.server.close(async () => {
                logger.info('HTTP server closed');
                closeDBConnection().then();
            });
        } else {
            closeDBConnection().then();
        }

        async function closeDBConnection() {
            if (db && db.orm) {
                await db.orm.close();
                logger.info('ORM connection closed');
            }
            if (db && db.pool) {
                db.pool.end(() => {
                    logger.info('DB pool closed');
                    Application.exit(exitCode);
                });
            } else {
                Application.exit(exitCode);
            }
        }
    }
}
