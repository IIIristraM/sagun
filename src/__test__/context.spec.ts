import { BaseService } from '../services/BaseService';
import { getDIContext } from '../context';
import { inject } from '../decorators/injectable';

class ClassA extends BaseService {
    toString() {
        return 'ClassA';
    }

    *method() {
        return 1;
    }
}

class ClassB extends BaseService {
    toString() {
        return 'ClassB';
    }

    classA: ClassA;

    constructor(@inject(ClassA) classA: ClassA) {
        super();

        this.classA = classA;
    }
}

class ClassC extends ClassB {
    toString() {
        return 'ClassC';
    }
}

class ClassD extends ClassB {
    toString() {
        return 'ClassD';
    }

    classC: ClassC;

    constructor(@inject(ClassA) classA: ClassA, @inject(ClassC) classC: ClassC) {
        super(classA);
        this.classC = classC;
    }
}

test('getDIContext', () => {
    const context = getDIContext();
    context.registerService(new ClassA());

    const classA = context.getService(ClassA);
    expect(classA instanceof ClassA).toBe(true);

    const classA2 = context.getService(ClassA);
    expect(classA).toBe(classA2);

    const classB = context.createService(ClassB);
    expect(classB.classA).toBe(classA);

    const classC = context.createService(ClassC);
    expect(classC.classA).toBe(classA);

    context.registerService(classC);

    const classD = context.createService(ClassD);
    expect(classD.classA).toBe(classA);
    expect(classD.classC).toBe(classC);
    expect(classD.classC.classA).toBe(classA);
});
