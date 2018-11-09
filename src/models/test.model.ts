import { Column, Entity, SelectQueryBuilder } from 'typeorm';
import { BaseModel } from './base.model';

@Entity()
export class TestThing extends BaseModel {

    // noinspection JSUnusedGlobalSymbols
    public static doQuery(): SelectQueryBuilder<TestThing> {
        return this.createQueryBuilder('test');
    }

    @Column({
        unique: true,
    })
    public name!: string;
}
