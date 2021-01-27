export function inheritDescriptor(descriptor: PropertyDescriptor, value: Function) {
    descriptor.value = Object.assign(value, descriptor.value);
    return descriptor;
}
