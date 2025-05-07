'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.api = exports.TestAPI = exports.DELAY = void 0;
var tslib_1 = require('tslib');
var utils_1 = require('./utils');
exports.DELAY = 20;
var TestAPI = /** @class */ (function () {
    function TestAPI(_a) {
        var delay = _a.delay;
        var _this = this;
        this.getUser = jest.fn(function (id) {
            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            return [4 /*yield*/, (0, utils_1.wait)(this._delay)];
                        case 1:
                            _a.sent();
                            return [
                                2 /*return*/,
                                {
                                    login: 'iiiristram',
                                },
                            ];
                    }
                });
            });
        });
        this.getUserDetails = jest.fn(function (login) {
            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            return [4 /*yield*/, (0, utils_1.wait)(this._delay)];
                        case 1:
                            _a.sent();
                            return [
                                2 /*return*/,
                                {
                                    cardLastDigits: '**00',
                                },
                            ];
                    }
                });
            });
        });
        this.getList = jest.fn(function () {
            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            return [4 /*yield*/, (0, utils_1.wait)(this._delay)];
                        case 1:
                            _a.sent();
                            return [
                                2 /*return*/,
                                {
                                    items: [1, 2, 3, 4, 5],
                                },
                            ];
                    }
                });
            });
        });
        this._delay = delay;
    }
    return TestAPI;
})();
exports.TestAPI = TestAPI;
exports.api = new TestAPI({ delay: exports.DELAY });
