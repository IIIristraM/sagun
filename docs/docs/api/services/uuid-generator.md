# UUIDGenerator

Utility service for generating unique IDs.

## Definition

```typescript
class UUIDGenerator extends Dependency {
  toString(): 'UUIDGenerator';
  uuid(prefix?: string): string;
}
```

## Methods

| Method | Description |
|--------|-------------|
| `uuid(prefix?)` | Generate unique ID, optionally with prefix |

## Description

`UUIDGenerator` provides unique identifiers for operations and other internal needs. It's automatically registered by the `Root` component.

## Example

```typescript
import { useDI } from '@iiiristram/sagun';

function MyComponent() {
  const di = useDI();
  const uuidGen = di.getService(UUIDGenerator);
  
  const id = uuidGen.uuid(); // "1"
  const prefixedId = uuidGen.uuid('item'); // "item_2"
}
```

## Internal Usage

Used internally by:

- `useSaga` for generating operation IDs
- `BaseService` for generating instance UUIDs

## See Also

- [Dependency](./dependency) - Base class

