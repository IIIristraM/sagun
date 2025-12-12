# Начало работы

Это руководство поможет вам настроить Sagun в вашем React приложении.

## Установка

```bash
# Сначала установите peer зависимости:
npm install react react-dom redux react-redux redux-saga immutable

# Затем установите Sagun:
npm install @iiiristram/sagun

# Также рекомендуется установить для строго типизированных эффектов саг:
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

Ниже представлен пример типовой инициализации приложения на базе redux и redux-saga, и подсвечены строки, которые необходимо добавить, чтобы настроить работу фреймворка

```tsx
// bootstrap.tsx
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React from 'react';
import ReactDOM from 'react-dom';
// highlight-start
import { call } from 'typed-redux-saga';
import {
  ComponentLifecycleService,
  OperationService,
  asyncOperationsReducer,
  Root,
  useOperation,
} from '@iiiristram/sagun';
// highlight-end

import {App} from './App';

// 1. Создаём saga middleware
const sagaMiddleware = createSagaMiddleware();

// 2. Создаём Redux store с reducer для операций
const store = applyMiddleware(sagaMiddleware)(createStore)(
  combineReducers({
    // highlight-next-line
    asyncOperations: asyncOperationsReducer,
  })
);

// 3. Настраиваем путь к операциям в state
// highlight-next-line
useOperation.setPath(state => state.asyncOperations);

// 4. Создаём основные сервисы
// highlight-start
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);
// highlight-end

// 5. Запускаем saga middleware с основными сервисами
sagaMiddleware.run(function* () {
  // highlight-start
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
  // highlight-end
});

// 6. Рендерим приложение
ReactDOM.render(
  // highlight-start
  <Root 
    operationService={operationService} 
    componentLifecycleService={componentLifecycleService}
  >
  // highlight-end
    <Provider store={store}>
      <App />
    </Provider>
  // highlight-next-line 
  </Root>,
  document.getElementById('app')
);
```
