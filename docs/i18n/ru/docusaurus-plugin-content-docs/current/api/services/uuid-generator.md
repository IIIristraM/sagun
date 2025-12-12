# UUIDGenerator

Утилитарный сервис для генерации уникальных ID.

## Определение

```typescript
class UUIDGenerator extends Dependency {
  toString(): 'UUIDGenerator';
  uuid(prefix?: string): string;
}
```

## Методы

| Метод | Описание |
|-------|----------|
| `uuid(prefix?)` | Сгенерировать уникальный ID, опционально с префиксом |

## Описание

`UUIDGenerator` предоставляет уникальные идентификаторы для операций и других внутренних нужд. Автоматически регистрируется компонентом `Root`.

## Пример

```typescript
import { useDI } from '@iiiristram/sagun';

function MyComponent() {
  const di = useDI();
  const uuidGen = di.getService(UUIDGenerator);
  
  const id = uuidGen.uuid(); // "1"
  const prefixedId = uuidGen.uuid('item'); // "item_2"
}
```

## Внутреннее использование

Используется внутри:

- `useSaga` для генерации ID операций
- `BaseService` для генерации UUID экземпляров

## См. также

- [Dependency](./dependency) — базовый класс

