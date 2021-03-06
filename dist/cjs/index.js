"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculate = exports.fetchArweaveStorageCost = exports.fetchTokenPrices = exports._promiseMap = exports._setCacheMs = void 0;
var request = require('axios');
var debug = require('debug')('arweave-cost');
var assert = function (truthy, msg) {
    if (!truthy)
        throw new Error(msg);
};
// arbundler uses a pricing endpoint which also accurately captures L2 fees.
// https://node1.bundlr.network/price/{totalUploadedBytes}
// internal fee calculation: fee(n) = bundler fee * l1_fee(1) * max(n, 2048) * network difficulty multiplier
var ARWEAVE_URL = 'https://node1.bundlr.network';
var CONVERSION_RATES_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=safe-coin-2,arweave&vs_currencies=usd';
var WINSTON_MULTIPLIER = Math.pow(10, 12);
var SafeName = String('safe-coin-2');
console.log(SafeName);
var toInt = function (val) { return parseInt(val, 10); };
/**
 * Cache promise results for 30 seconds
 */
var promiseCacheMs = 30000;
var _setCacheMs = function (ms) { return promiseCacheMs = ms; };
exports._setCacheMs = _setCacheMs;
exports._promiseMap = new Map();
var memoPromise = function (method, args) {
    var key = "" + method.toString() + JSON.stringify(args);
    if (exports._promiseMap.has(key)) {
        return exports._promiseMap.get(key);
    }
    var promise = new Promise(function (resolve, reject) {
        return method.apply(void 0, args).catch(function (err) {
            exports._promiseMap.delete(method);
            reject(err);
        }).then(resolve);
    });
    // cache for the configured time
    exports._promiseMap.set(key, promise);
    var timer = setTimeout(function () {
        exports._promiseMap.delete(key);
    }, promiseCacheMs);
    // allow program exit while timer is active
    if (timer.unref) {
        timer.unref();
    }
    return promise;
};
var memoize = function (asyncFn) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var result = memoPromise(asyncFn, args);
        return result;
    };
};
exports.fetchTokenPrices = memoize(function () {
    return request(CONVERSION_RATES_URL).then(function (response) {
        var _a, _b;
        var body = response.data;
        //console.log(body["safe-coin-2"]);
        if (!(((_a = body.arweave) === null || _a === void 0 ? void 0 : _a.usd) && ((_b = body["safe-coin-2"]) === null || _b === void 0 ? void 0 : _b.usd))) {
            debug('Invalid coingecko response', body);
            throw new Error('Invalid response from coingecko');
        }
        return body;
    });
});
exports.fetchArweaveStorageCost = memoize(function (totalBytes) {
    assert(Number.isFinite(totalBytes), "Invalid argument: totalBytes. Received: " + totalBytes);
    return request(ARWEAVE_URL + "/price/" + totalBytes).then(function (response) { return toInt(response.data); });
});
var validate = function (fileSizes) {
    assert(Array.isArray(fileSizes) && fileSizes.length > 0 && fileSizes.every(function (k) {
        return Number(k) === k && !isNaN(k) && k >= 0 && isFinite(k);
    }), 'Invalid argument: fileSizes must be an array of integers');
};
var kb = function (kilobytes) { return kilobytes * 1024; };
var MINIMUM_WINSTON_FEE = 10000000; // 0.00001 AR
var AR_FEE_MULTIPLIER = 15 / 100; // 15%
// test this. Then make public. Then pull into arweave cloud fn and metaplex
var calculate = function (fileSizes) { return __awaiter(void 0, void 0, void 0, function () {
    var totalBytes, _a, conversionRates, totalWinstonCost, totalArCost, arweavePrice, safecoinPrice, exchangeRate;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                validate(fileSizes);
                totalBytes = fileSizes.reduce(function (sum, fileSize) {
                    return sum += fileSize;
                }, 0);
                return [4 /*yield*/, Promise.all([
                        (0, exports.fetchTokenPrices)(),
                        (0, exports.fetchArweaveStorageCost)(totalBytes)
                    ])];
            case 1:
                _a = _b.sent(), conversionRates = _a[0], totalWinstonCost = _a[1];
                totalArCost = totalWinstonCost / WINSTON_MULTIPLIER;
                arweavePrice = conversionRates.arweave.usd;
                safecoinPrice = conversionRates["safe-coin-2"].usd;
                exchangeRate = arweavePrice / safecoinPrice;
                debug('%j', {
                    arweaveRate: arweavePrice,
                    safecoinRate: safecoinPrice,
                    exchangeRate: exchangeRate,
                    WINSTON_MULTIPLIER: WINSTON_MULTIPLIER,
                    totalWinstonCost: totalWinstonCost,
                    totalArCost: totalArCost,
                    totalBytes: totalBytes
                });
                return [2 /*return*/, {
                        arweave: totalArCost,
                        safecoin: totalArCost * exchangeRate,
                        arweavePrice: arweavePrice,
                        safecoinPrice: safecoinPrice,
                        exchangeRate: exchangeRate,
                        totalBytes: totalBytes,
                    }];
        }
    });
}); };
exports.calculate = calculate;
