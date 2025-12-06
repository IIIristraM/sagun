# Начало работы

Это руководство поможет вам настроить Sagun в вашем React приложении.

## Установка

Сначала установите peer зависимости:

```bash
npm install react react-dom redux react-redux redux-saga immutable
```

Затем установите Sagun:

```bash
npm install @iiiristram/sagun
```

Также рекомендуется установить `typed-redux-saga` для строго типизированных эффектов саг:

```bash
npm install typed-redux-saga
```

## Конфигурация TypeScript

Sagun использует декораторы TypeScript. Включите их в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Инициализация приложения

Создайте файл инициализации для вашего приложения:

```tsx
// bootstrap.tsx
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React from 'react';
import ReactDOM from 'react-dom';
import { call } from 'typed-redux-saga';
import {
  ComponentLifecycleService,
  OperationService,
  asyncOperationsReducer,
  Root,
  useOperation,
} from '@iiiristram/sagun';

import App from './App';

// 1. Создаём saga middleware
const sagaMiddleware = createSagaMiddleware();

// 2. Создаём Redux store с reducer для операций
const store = applyMiddleware(sagaMiddleware)(createStore)(
  combineReducers({
    asyncOperations: asyncOperationsReducer,
  })
);

// 3. Настраиваем путь к операциям в state
useOperation.setPath(state => state.asyncOperations);

// 4. Создаём основные сервисы
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

// 5. Запускаем saga middleware с основными сервисами
sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

// 6. Рендерим приложение
ReactDOM.render(
  <Root 
    operationService={operationService} 
    componentLifecycleService={componentLifecycleService}
  >
    <Provider store={store}>
      <App />
    </Provider>
  </Root>,
  document.getElementById('app')
);
```

## Создание первого сервиса

Сервисы содержат вашу бизнес-логику. Вот простой пример:

```tsx
// services/TodoService.ts
import { Service, operation, daemon, DaemonMode } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export class TodoService extends Service {
  // Обязательно: уникальный идентификатор сервиса
  toString() {
    return 'TodoService';
  }

  // @operation сохраняет результат в Redux store
  // @daemon делает метод вызываемым через Redux action
  @operation
  @daemon()
  *fetchTodos() {
    const response: Response = yield* call(fetch, '/api/todos');
    const todos: Todo[] = yield* call([response, response.json]);
    return todos;
  }

  @daemon(DaemonMode.Last) // Отменяет предыдущий вызов при новом
  *addTodo(title: string) {
    const response: Response = yield* call(fetch, '/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return yield* call([response, response.json]);
  }
}
```

## Использование сервиса в компоненте

```tsx
// components/TodoList.tsx
import React, { Suspense } from 'react';
import { 
  useDI, 
  useService, 
  useServiceConsumer, 
  useOperation, 
  Operation,
  getId 
} from '@iiiristram/sagun';
import { TodoService } from '../services/TodoService';

// Компонент страницы — инициализирует сервис
export function TodoPage() {
  const di = useDI();
  
  // Создаём и регистрируем экземпляр сервиса
  const service = di.createService(TodoService);
  di.registerService(service);
  
  // Инициализируем сервис (вызывает service.run())
  const { operationId } = useService(service);
  
  return (
    <Suspense fallback={<div>Загрузка сервиса...</div>}>
      <Operation operationId={operationId}>
        {() => <TodoList />}
      </Operation>
    </Suspense>
  );
}

// Дочерний компонент — использует сервис
function TodoList() {
  const { service, actions } = useServiceConsumer(TodoService);
  
  // Подписываемся на результат операции
  const operation = useOperation({
    operationId: getId(service.fetchTodos),
    suspense: true,
  });
  
  const todos = operation?.result || [];
  
  return (
    <div>
      <button onClick={() => actions.fetchTodos()}>
        Обновить
      </button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Следующие шаги

Теперь, когда Sagun настроен, узнайте больше о:

- [Операции](./concepts/operations) — понимание основной структуры данных
- [Сервисы](./concepts/services) — глубокое погружение в паттерны сервисов
- [Dependency Injection](./advanced/dependency-injection) — управление зависимостями сервисов

