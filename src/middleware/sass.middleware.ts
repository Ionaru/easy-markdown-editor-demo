import * as path from 'path';
import * as fs from 'fs';
import * as sass from 'sass';
import { Request, Response, NextFunction, RequestHandler } from 'express';

interface ISassCache {
    [key: string]: sass.CompileResult;
}

interface ISassMiddlewareOptions {
    debug: boolean;
    prefix: string;
    sourceMap: boolean;
    src: string;
}

const cache: ISassCache = {};

export const createSassMiddleware = (
    options: ISassMiddlewareOptions,
    ): RequestHandler => (request: Request, response: Response, next: NextFunction) => {

    if (!request.path.endsWith('.css')) {
        return next();
    }

    const requestPath = request.path.replace('/stylesheets', '');

    const file = path.join(process.cwd(), options.src, requestPath).replace('.css', '.scss');

    if (!fs.existsSync(file)) {
        return next();
    }

    if (!cache[requestPath]) {
        cache[requestPath] = sass.compile(file, {
            sourceMap: options.sourceMap,
            style: options.debug ? 'expanded' : 'compressed',
            verbose: options.debug,
        });

        fs.watchFile(file, _ => {
            delete cache[requestPath];
            fs.unwatchFile(file);
        });
    }

    response.header('content-type', 'text/css');
    response.send(cache[requestPath].css);
};
