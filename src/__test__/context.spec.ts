import { BaseService } from '../services/BaseService';
import { getDIContext } from '../context';
import { injectable } from '../decorators/injectable';

test('getDIContext', () => {
    const context = getDIContext();

    class ClassA extends BaseService {
        toString() {
            return 'ClassA';
        }

        *method() {
            return 1;
        }
    }

    context.registerService(new ClassA());

    const classA = context.getService(ClassA);
    expect(classA instanceof ClassA).toBe(true);

    const classA2 = context.getService(ClassA);
    expect(classA).toBe(classA2);

    @injectable
    class ClassB extends BaseService {
        toString() {
            return 'ClassB';
        }

        classA: ClassA;

        constructor(classA: ClassA) {
            super();

            this.classA = classA;
        }
    }

    const classB = context.createService(ClassB);
    expect(classB.classA).toBe(classA);
});
