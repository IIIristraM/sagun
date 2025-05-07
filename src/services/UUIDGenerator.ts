import { Dependency } from './Dependency';

export class UUIDGenerator extends Dependency {
    toString() {
        return 'UUIDGenerator';
    }

    private id = {} as Record<string, number>;

    uuid(prefix?: string) {
        const id = this.id[prefix ?? '__common__'] ?? 0;
        const uuid = `${prefix ? `${prefix}_` : ''}${id}`;
        this.id[prefix ?? '__common__'] = id + 1;
        return uuid;
    }

    reset() {
        this.id = {};
    }
}
