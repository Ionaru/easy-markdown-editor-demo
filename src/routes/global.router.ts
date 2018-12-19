import { NextFunction, Request, Response } from 'express';

import { BaseRouter } from './base.router';

export class GlobalRouter extends BaseRouter {

    /**
     * All requests to the server go through this router (except when fetching static files).
     */
    private static globalRoute(_request: Request, _response: Response, next?: NextFunction): void {
        // Continue to the other routes
        if (next) {
            next();
        }
    }

    constructor() {
        super();
        this.createAllRoute('/', GlobalRouter.globalRoute);
    }
}
