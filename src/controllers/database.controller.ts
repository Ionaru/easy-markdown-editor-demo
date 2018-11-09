import * as fs from 'fs';
import { createPool, Pool, PoolConfig } from 'mysql';
import * as path from 'path';
import { logger } from 'winston-pnp-logger';

import { config, configPath } from './configuration.controller';

export let db: DatabaseConnection;

export class DatabaseConnection {

    public pool?: Pool;

    private readonly dbOptions: PoolConfig;

    constructor() {
        this.dbOptions = {
            database: config.getProperty('db_name') as string,
            host: config.getProperty('db_host') as string,
            password: config.getProperty('db_pass') as string,
            port: config.getProperty('db_port', 3306) as number,
            user: config.getProperty('db_user') as string,
        };

        const sslCA = config.getProperty('db_ca_f') as string;
        const sslCert = config.getProperty('db_cc_f') as string;
        const sslKey = config.getProperty('db_ck_f') as string;
        if (sslCA && sslCert && sslKey) {
            this.dbOptions.ssl = {
                ca: fs.readFileSync(path.join(configPath, sslCA)).toString(),
                cert: fs.readFileSync(path.join(configPath, sslCert)).toString(),
                key: fs.readFileSync(path.join(configPath, sslKey)).toString(),
                rejectUnauthorized: config.getProperty('db_reject') as boolean,
            };
        }

        db = this;
    }

    public async connect(): Promise<void> {
        if (this.dbOptions.ssl && typeof this.dbOptions.ssl !== 'string' && !this.dbOptions.ssl.rejectUnauthorized) {
            logger.warn('SSL connection to Database is not secure, \'db_reject\' should be true');
        } else if (!this.dbOptions.ssl) {
            if (['localhost', '0.0.0.0', '127.0.0.1'].indexOf(config.getProperty('db_host') as string) === -1) {
                logger.warn('Connection to Database is not secure, always use SSL to connect to external databases!');
            }
        }

        this.pool = createPool(this.dbOptions);

        logger.info('Database connected');
    }
}
