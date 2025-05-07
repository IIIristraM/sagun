'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var tslib_1 = require('tslib');
var redux_1 = require('redux');
var react_redux_1 = require('react-redux');
var redux_saga_1 = tslib_1.__importDefault(require('redux-saga'));
var react_1 = tslib_1.__importStar(require('react'));
var client_1 = tslib_1.__importDefault(require('react-dom/client'));
// import ReactDOM from "react-dom";
var src_1 = require('../src');
var typed_redux_saga_1 = require('typed-redux-saga');
var UUIDGenerator_1 = require('../src/services/UUIDGenerator');
var DELAY = 5000;
var sagaMiddleware = (0, redux_saga_1.default)();
var store = (0, redux_1.applyMiddleware)(sagaMiddleware)(redux_1.createStore)(
    (0, redux_1.combineReducers)({
        asyncOperations: src_1.asyncOperationsReducer,
    })
);
src_1.useOperation.setPath(function (state) {
    return state.asyncOperations;
});
var operationService = new src_1.OperationService();
var componentLifecycleService = new src_1.ComponentLifecycleService(operationService);
sagaMiddleware.run(function () {
    return tslib_1.__generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                return [5 /*yield**/, tslib_1.__values((0, typed_redux_saga_1.call)(operationService.run))];
            case 1:
                _a.sent();
                return [5 /*yield**/, tslib_1.__values((0, typed_redux_saga_1.call)(componentLifecycleService.run))];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
});
var AppService = /** @class */ (function (_super) {
    tslib_1.__extends(AppService, _super);
    function AppService() {
        return (_super !== null && _super.apply(this, arguments)) || this;
    }
    AppService.prototype.toString = function () {
        return 'AppService';
    };
    AppService.prototype.loadContent = function (counter) {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    return [5 /*yield**/, tslib_1.__values((0, typed_redux_saga_1.delay)(DELAY))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, counter];
            }
        });
    };
    AppService.prototype.run = function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    return [4 /*yield*/, (0, typed_redux_saga_1.call)([this, _super.prototype.run])];
                case 1:
                    _a.sent();
                    return [5 /*yield**/, tslib_1.__values((0, typed_redux_saga_1.delay)(DELAY))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    };
    tslib_1.__decorate([src_1.operation], AppService.prototype, 'loadContent', null);
    return AppService;
})(src_1.Service);
var Context = react_1.default.createContext(null);
var OperationWaiter = (0, react_1.memo)(function (_a) {
    var operationId = _a.operationId,
        setState = _a.setState;
    var context = (0, react_1.useContext)(Context);
    var operation = (0, src_1.useOperation)({
        operationId: operationId,
        suspense: true,
    });
    (0, react_1.useEffect)(function mutation() {
        context === null || context === void 0 ? void 0 : context.resolve();
        console.log('OP', operation.result);
    });
    (0, react_1.useEffect)(
        function () {
            if (context && context.counter() < 3) {
                console.info('setState');
                setState(context.counter());
            }
        },
        [context === null || context === void 0 ? void 0 : context.counter()]
    );
    return react_1.default.createElement('div', null, operation.result);
});
var InnerComponent = function () {
    var context = (0, react_1.useContext)(Context);
    var testService = (0, src_1.useServiceConsumer)(AppService).service;
    var _a = tslib_1.__read(
            (0, react_1.useState)(context === null || context === void 0 ? void 0 : context.counter()),
            2
        ),
        state = _a[0],
        setState = _a[1];
    console.log('InnerComponent');
    var operationId = (0, src_1.useSaga)(
        'test-id',
        {
            onLoad: testService.loadContent,
        },
        [state]
    ).operationId;
    return react_1.default.createElement(OperationWaiter, { operationId: operationId, setState: setState });
};
var InnerComponent2 = function () {
    var di = (0, src_1.useDI)();
    var testService = (0, src_1.useServiceConsumer)(AppService).service;
    // const uuidGen = di.getService(UUIDGenerator);
    var operationId = (0, src_1.useSaga)(
        'test-id-2',
        {
            onLoad: testService.loadContent,
        },
        [3]
    ).operationId;
    var result = (0, src_1.useOperation)({
        operationId: operationId,
        suspense: true,
    }).result;
    // console.log('InnerComponent2', 'id_' + uuidGen.uuid());
    return react_1.default.createElement('div', null, result);
};
var TestComponent = function () {
    var di = (0, src_1.useDI)();
    var appService = di.createService(AppService);
    di.registerService(appService);
    var uuidGen = di.getService(UUIDGenerator_1.UUIDGenerator);
    (0, react_1.useMemo)(function () {
        console.log('RESET UUID');
        uuidGen.reset();
    }, []);
    var operationId = (0, src_1.useService)(appService).operationId;
    return react_1.default.createElement(
        react_1.default.Fragment,
        null,
        react_1.default.createElement(src_1.Operation, { operationId: operationId }, function () {
            return react_1.default.createElement(InnerComponent, null);
        }),
        react_1.default.createElement(InnerComponent2, null)
    );
};
function App() {
    var defer = [(0, src_1.createDeferred)(), (0, src_1.createDeferred)(), (0, src_1.createDeferred)()];
    var counter = 0;
    return react_1.default.createElement(
        Context.Provider,
        {
            value: {
                counter: function () {
                    return counter;
                },
                resolve: function () {
                    return defer[counter++].resolve();
                },
            },
        },
        react_1.default.createElement(
            react_1.Suspense,
            { fallback: 'Loading...' },
            react_1.default.createElement(TestComponent, null)
        )
    );
}
var root = client_1.default.createRoot(document.getElementById('app'), {
    // onUncaughtError: (error, errorInfo) => {
    // console.error("onUncaughtError", error, errorInfo)
    // },
    // onCaughtError: (error, errorInfo) => {
    // console.error("onCaughtError", error, errorInfo)
    // }
});
root.render(
    react_1.default.createElement(
        src_1.Root,
        { operationService: operationService, componentLifecycleService: componentLifecycleService },
        react_1.default.createElement(
            react_redux_1.Provider,
            { store: store },
            react_1.default.createElement(App, null)
        )
    )
);
// ReactDOM.render(
//     <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
//         <Provider store={store}>
//             <App />
//         </Provider>
//     </Root>,
//     document.getElementById('app')!
// );
