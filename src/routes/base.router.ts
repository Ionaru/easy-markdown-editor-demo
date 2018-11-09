import { NextFunction, Request, Response, Router } from 'express';
import { PathParams, RequestHandler, RequestHandlerParams } from 'express-serve-static-core';
import { logger } from 'winston-pnp-logger';

export interface IResponse extends Response {
    route?: string[];
}

export class BaseRouter {
    public router = Router();

    constructor() {
        logger.info(`New router: ${this.constructor.name}`);
    }

    // noinspection JSUnusedGlobalSymbols
    public createAllRoute(url: PathParams, routeFunction: RequestHandler | RequestHandlerParams): void {
        this.router.all(url, this.asyncHandler(routeFunction));
    }

    // noinspection JSUnusedGlobalSymbols
    public createGetRoute(url: PathParams, routeFunction: RequestHandler | RequestHandlerParams): void {
        this.router.get(url, this.asyncHandler(routeFunction));
    }

    // noinspection JSUnusedGlobalSymbols
    public createPostRoute(url: PathParams, routeFunction: RequestHandler | RequestHandlerParams): void {
        this.router.post(url, this.asyncHandler(routeFunction));
    }

    // noinspection JSUnusedGlobalSymbols
    public createPutRoute(url: PathParams, routeFunction: RequestHandler | RequestHandlerParams): void {
        this.router.put(url, this.asyncHandler(routeFunction));
    }

    // noinspection JSUnusedGlobalSymbols
    public createDeleteRoute(url: PathParams, routeFunction: RequestHandler | RequestHandlerParams): void {
        this.router.delete(url, this.asyncHandler(routeFunction));
    }

    private asyncHandler(routeFunction: any): any {
        return (request: Request, response: IResponse, next: NextFunction) => {
            if (!response.route) {
                response.route = [];
            }
            response.route.push(this.constructor.name);
            Promise.resolve(routeFunction(request, response, next)).catch(next);
        };
    }
}
