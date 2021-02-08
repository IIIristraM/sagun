export class Dependency {
    toString(): string {
        throw new Error('toString should return uniq constant');
    }
}
