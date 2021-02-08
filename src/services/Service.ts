import { call } from 'typed-redux-saga';

import { BaseService } from './BaseService';
import { Gen } from '../types';
import { injectable } from '../decorators/injectable';
import { OperationService } from './OperationService';

@injectable
export class Service<TRunArgs extends any[] = [], TRes = void> extends BaseService<TRunArgs, TRes> {
    protected _operationsService: OperationService;

    constructor(operationService: OperationService) {
        super();
        this._operationsService = operationService;
    }

    *destroy(...args: TRunArgs): Gen<void> {
        yield* call([this, super.destroy], ...args);
        yield* call(this._operationsService.unregisterConsumer, this);
    }
}
