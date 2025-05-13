import { describe, expect, test } from 'vitest';

import { getClassMethods, getKeys } from '../getKeys';

describe('getKeys', () => {
    test('object', () => {
        expect(
            getKeys({
                a: 1,
                b: 2,
            })
        ).toEqual(['a', 'b']);
    });

    test('class', () => {
        class Test {
            a() {}
            c = 2;
        }

        const keys = getKeys(new Test());
        expect(keys).toContain('c');
        expect(keys).toContain('a');
    });

    test('class inherit', () => {
        class TestA {
            a() {}
            b() {}
            c = 2;
        }

        class TestB extends TestA {
            a() {}
            c = 2;
        }

        const keys = getKeys(new TestB());
        expect(keys).toContain('c');
        expect(keys).toContain('a');
        expect(keys).toContain('b');
    });

    test('class static', () => {
        class Test {
            static a() {}
            static c = 2;
        }

        const keys = getKeys(Test);
        expect(keys).toContain('c');
        expect(keys).toContain('a');
    });

    test('class static inherit', () => {
        class TestA {
            static a() {}
            static b() {}
            static c = 2;
        }

        class TestB extends TestA {
            static a() {}
            static c = 2;
        }

        const keys = getKeys(TestB);
        expect(keys).toContain('c');
        expect(keys).toContain('a');
        expect(keys).toContain('b');
    });
});

describe('getClassMethods', () => {
    test('object', () => {
        expect(
            getClassMethods({
                a: 1,
                b: 2,
            })
        ).toEqual([]);
    });

    test('class', () => {
        class Test {
            a() {}
            c = 2;
        }

        const keys = getClassMethods(new Test());
        expect(keys).not.toContain('c');
        expect(keys).toContain('a');
        expect(keys.length).toBe(1);
    });

    test('class inherit', () => {
        class TestA {
            a() {}
            b() {}
            c = 2;
        }

        class TestB extends TestA {
            a() {}
            c = 2;
        }

        const keys = getClassMethods(new TestB());
        expect(keys).not.toContain('c');
        expect(keys).toContain('a');
        expect(keys).toContain('b');
        expect(keys.length).toBe(2);
    });

    test('class static', () => {
        class Test {
            static a() {}
            static c = 2;
        }

        const keys = getClassMethods(Test);
        expect(keys).not.toContain('c');
        expect(keys).toContain('a');
    });

    test('class inherit', () => {
        class TestA {
            static a() {}
            static b() {}
            static c = 2;
        }

        class TestB extends TestA {
            static a() {}
            static c = 2;
        }

        const keys = getClassMethods(TestB);
        expect(keys).not.toContain('c');
        expect(keys).toContain('a');
        expect(keys).toContain('b');
        expect(keys.length).toBe(2);
    });
});
