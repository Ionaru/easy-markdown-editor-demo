import chalk, { Chalk, ColorSupport } from 'chalk';
import { NextFunction, Request, Response } from 'express';
import * as onFinished from 'on-finished';
import { logger } from 'winston-pnp-logger';

import { IResponse } from '../routes/base.router';

export class RequestLogger {
    public static ignoredUrls = ['/modules', '/images', '/fonts', '/stylesheets', '/scripts', '/favicon.ico'];
    public static ignoredExtension = ['.ico', '.js', '.css', '.png', '.jpg', '.svg', '.html'];
    public static arrow = chalk.white('->');

    public static logRequest(): any {
        return function log(request: Request, response: Response, next: NextFunction) {

            const requestStartTime = Date.now();

            // Runs when the request has finished.
            onFinished(response, async (_err, endResponse: IResponse) => {

                const ignoredUrlMatch = RequestLogger.ignoredUrls.filter(
                    (ignoredUrl) => request.originalUrl.startsWith(ignoredUrl)).length;

                const ignoredExtensionMatch = RequestLogger.ignoredExtension.filter(
                    (ignoredExtension) => request.originalUrl.endsWith(ignoredExtension)).length;

                // Do not log requests to static URLs and files unless their status code is not OK.
                if ((!ignoredExtensionMatch && !ignoredUrlMatch) || (endResponse.statusCode !== 200 && endResponse.statusCode !== 304)) {

                    const statusColor = RequestLogger.getStatusColor(endResponse.statusCode);
                    const status = statusColor(`${endResponse.statusCode} ${endResponse.statusMessage}`);

                    const route = endResponse.route;
                    const router = chalk.white(route && route.length ? route!.join(' > ') : 'ServeStatic');

                    const ip = RequestLogger.getIp(request);
                    const identifier = `${ip} (${chalk.white(request.sessionID!)})`;

                    const text = `${request.method} ${request.originalUrl}`;

                    const requestDuration = Date.now() - requestStartTime;
                    const arrow = RequestLogger.arrow;

                    const logContent = `${identifier}: ${text} ${arrow} ${router} ${arrow} ${status}, ${requestDuration}ms`;

                    if (endResponse.statusCode >= 500) {
                        logger.error(logContent);
                    } else if (endResponse.statusCode >= 400) {
                        logger.warn(logContent);
                    } else {
                        logger.debug(logContent);
                    }
                }
            });
            next();
        };
    }

    public static getStatusColor(statusCode: number): Chalk & { supportsColor: ColorSupport } {
        if (statusCode >= 500) {
            return chalk.red;
        } else if (statusCode >= 400) {
            return chalk.yellow;
        } else if (statusCode >= 300) {
            return chalk.cyan;
        } else if (statusCode >= 200) {
            return chalk.green;
        } else {
            return chalk.whiteBright;
        }
    }

    private static getIp(request: Request) {
        let ip = request.ip ||
            request.headers['x-forwarded-for'] ||
            'Unknown IP';
        if (typeof ip === 'string' && ip.substr(0, 7) === '::ffff:') {
            ip = ip.substr(7);
        }
        return ip;
    }
}
