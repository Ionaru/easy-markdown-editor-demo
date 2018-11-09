import { NextFunction, Request } from 'express';
import { logger } from 'winston-pnp-logger';

import { IResponse } from './base.router';

export class ErrorRouter {

    /**
     * Handle errors thrown in requests, show or hide the stacktrace depending on the environment.
     */
    public static errorRoute(error: Error, request: Request, response: IResponse, _next: NextFunction): void {
        response.route!.push('ErrorRouter');
        response.status(500);
        logger.error(`Error on ${request.method} ${request.originalUrl} -> ${error.stack}`);
        const errorDetails = process.env.NODE_ENV === 'production' ? undefined : {error: error.stack};
        response.send(errorDetails);
    }
}
