import { Dependency } from './Dependency';

export class UUIDGenerator extends Dependency {
    toString() {
        return 'UUIDGenerator';
    }

    private id = 0;

    uuid(prefix?: string) {
        return `${prefix ? `${prefix}_` : ''}${this.id++}`;
    }
}
