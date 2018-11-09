import { Request, Response } from 'express';

import { BaseRouter } from './base.router';

export class NotFoundRouter extends BaseRouter {

    /**
     * If no other route was able to handle the request, then we return a 404 NOT FOUND error.
     */
    private static notFoundRoute(request: Request, response: Response): void {
        response.status(404);
        response.send(`${request.baseUrl} NOT FOUND`);
    }

    constructor() {
        super();
        this.createAllRoute('/', NotFoundRouter.notFoundRoute);
    }
}
