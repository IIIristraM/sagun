import { Dependency } from '../services/Dependency';
import { DependencyKey } from '../types';
import { getDIContext } from '../context';
import { inject } from '../decorators/injectable';

type Config = {
    host: string;
};

const CONFIGURATION_DEP_KEY = 'CONFIGURATION_DEP_KEY' as DependencyKey<Config>;

const CONFIG: Config = {
    host: 'host',
};

class ClassA extends Dependency {
    toString() {
        return 'ClassA';
    }

    *method() {
        return 1;
    }
}

class ClassB extends Dependency {
    toString() {
        return 'ClassB';
    }

    classA: ClassA;
    config: Config;

    constructor(@inject(ClassA) classA: ClassA, @inject(CONFIGURATION_DEP_KEY) config: Config) {
        super();

        this.classA = classA;
        this.config = config;
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

    constructor(
        @inject(ClassA) classA: ClassA,
        @inject(ClassC) classC: ClassC,
        @inject(CONFIGURATION_DEP_KEY) config: Config
    ) {
        super(classA, config);
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

    context.registerDependency(CONFIGURATION_DEP_KEY, CONFIG);

    const classB = context.createService(ClassB);
    expect(classB.classA).toBe(classA);
    expect(classB.config).toBe(CONFIG);

    const classC = context.createService(ClassC);
    expect(classC.classA).toBe(classA);
    expect(classB.config).toBe(CONFIG);

    context.registerService(classC);

    const classD = context.createService(ClassD);
    expect(classD.classA).toBe(classA);
    expect(classD.config).toBe(CONFIG);
    expect(classD.classC).toBe(classC);
    expect(classD.classC.classA).toBe(classA);
    expect(classD.classC.config).toBe(CONFIG);
});
