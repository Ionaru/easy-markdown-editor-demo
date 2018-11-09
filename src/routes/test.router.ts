import { Request, Response } from 'express';
import { TestThing } from '../models/test.model';

import { BaseRouter } from './base.router';

export class TestRouter extends BaseRouter {

    private static async testGet(_request: Request, response: Response): Promise<void> {

        const entitiesCount = await TestThing.count();

        const newEntity = new TestThing();
        newEntity.name = `entity ${entitiesCount + 1}`;
        await newEntity.save();

        return response.render('pages/test.hbs', {count: entitiesCount + 1});
    }

    private static async testPost(request: Request, response: Response): Promise<void> {
        response.send(`You posted: ${request.body}`);
    }

    constructor() {
        super();
        this.createGetRoute('/', TestRouter.testGet);
        this.createPostRoute('/login', TestRouter.testPost);
    }
}
