import axios from 'axios';
import { Request, Response } from 'express';

import { BaseRouter } from './base.router';

interface INPMInfo {
    _id: string;
    _rev: string;
    name: string;
    'dist-tags': {
        latest: string;
        next: string;
    };
    versions: {
        [key: string]: {
            name: string;
            version: string;
            description: string;
            keywords: string[];
            main: string;
            license: string;
            author: {
                name: string;
            }
            bugs: {
                url: string;
            }
            dependencies: {
                [key: string]: string;
            }
            devDependencies: {
                [key: string]: string;
            }
            repository: {
                type: string;
                url: string;
            }
            gitHead: string;
            homepage: string;
            _id: string;
            _npmVersion: string;
            _nodeVersion: string;
            _npmUser: {
                name: string;
                email: string
            };
            dist: {
                integrity: string;
                shasum: string;
                tarball: string;
                fileCount: number;
                unpackedSize: number;
                'npm-signature': string;
            };
            maintainers: Array<{
                name: string;
                email: string
            }>
            directories: {};
            _npmOperationalInternal: {
                host: string;
                tmp: string
            };
            _hasShrinkwrap: boolean;
        };
    };
}

export class HomeRouter extends BaseRouter {

    private static cachedLatestVersion?: string;
    private static cachedAvailableVersions: string[] = [];
    private static cachedNPMInfo?: INPMInfo;

    private static async getNPMInfo() {
        if (HomeRouter.cachedNPMInfo) {
            return HomeRouter.cachedNPMInfo;
        } else {
            const npmInfo = await axios.get<INPMInfo>('https://registry.npmjs.org/easymde');
            HomeRouter.cachedNPMInfo = npmInfo.data;

            setTimeout(() => {
                HomeRouter.cachedNPMInfo = undefined;
            }, 10800000);

            return npmInfo.data;
        }
    }

    private static async homepage(request: Request, response: Response): Promise<void> {
        let version = request.params.id;

        if (!version) {
            if (HomeRouter.cachedLatestVersion) {
                version = HomeRouter.cachedLatestVersion;
            } else  {
                const npmInfo = await HomeRouter.getNPMInfo();
                version = npmInfo['dist-tags'].latest;

                HomeRouter.cachedLatestVersion = version;
                setTimeout(() => {
                    HomeRouter.cachedLatestVersion = undefined;
                }, 10800000);  // 3 hours.
            }
        }

        if (version !== HomeRouter.cachedLatestVersion) {

            const npmInfo = await HomeRouter.getNPMInfo();
            HomeRouter.cachedAvailableVersions = Object.keys(npmInfo.versions);

            if (version === 'next' && npmInfo['dist-tags'] && npmInfo['dist-tags'].next) {
                version = npmInfo['dist-tags'].next;
            }

            if (!HomeRouter.cachedAvailableVersions.includes(version)) {
                response.status(404);
            }
        }

        const useFA4 = request.query.fa4;
        const onReleaseVersion = version === HomeRouter.cachedLatestVersion;
        return response.render('pages/home.hbs', {useFA4, version, onReleaseVersion});
    }

    constructor() {
        super();
        this.createGetRoute('/', HomeRouter.homepage);
        this.createGetRoute('/latest', HomeRouter.homepage);
        this.createGetRoute('/:id(next)', HomeRouter.homepage);

        this.createGetRoute('/:id([0-9]+\.[0-9]+\.[0-9]+)', HomeRouter.homepage);
        this.createGetRoute('/v:id([0-9]+\.[0-9]+\.[0-9]+)', HomeRouter.homepage);
    }
}
