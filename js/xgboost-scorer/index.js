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
// exports.__esModule = true;
function loadJson(file) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, file];
        });
    });
}
function sigmoid(x) {
    return 1 / (1 + Math.pow(Math.E, -x));
}
function isLeaf(node) {
    return node.leaf !== undefined;
}
var Scorer = /** @class */ (function () {
    function Scorer() {
    }
    Scorer.create = function (model, featureIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var scorer, _a, _b, loadedFeatureIndex_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        scorer = new Scorer;
                        _a = scorer;
                        if (!(typeof model === "string")) return [3 /*break*/, 2];
                        return [4 /*yield*/, loadJson(model)];
                    case 1:
                        _b = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _b = model;
                        _d.label = 3;
                    case 3:
                        _a.model = _b;
                        if (!featureIndex) return [3 /*break*/, 7];
                        if (!(typeof featureIndex === "string")) return [3 /*break*/, 5];
                        return [4 /*yield*/, loadJson(featureIndex)];
                    case 4:
                        _c = _d.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _c = featureIndex;
                        _d.label = 6;
                    case 6:
                        loadedFeatureIndex_1 = _c;
                        scorer.reverseFeatureIndex =
                            Object.keys(loadedFeatureIndex_1)
                                .reduce(function (acc, fName) {
                                var fIdx = loadedFeatureIndex_1[fName];
                                acc["".concat(fIdx)] = fName;
                                return acc;
                            }, {});
                        _d.label = 7;
                    case 7: return [2 /*return*/, scorer];
                }
            });
        });
    };
    Scorer.prototype.scoreSingleInstance = function (features) {
        if (!this.model) {
            throw new Error("Scorer not initialized, create a scorer using Scorer.create() only");
        }
        var totalScore = this.model
            .map(function (booster) {
            var currNode = booster;
            var _loop_1 = function () {
                var splitFeature = currNode.split;
                var nextNodeId;
                if (features[splitFeature] !== undefined) {
                    var conditionResult = features[splitFeature] < currNode.split_condition;
                    nextNodeId = conditionResult ? currNode.yes : currNode.no;
                }
                else {
                    // Missing feature
                    nextNodeId = currNode.missing;
                }
                var nextNode = currNode.children.find(function (child) { return child.nodeid === nextNodeId; });
                if (nextNode === undefined) {
                    throw new Error("Invalid model JSON, missing node ID: ".concat(nextNodeId));
                }
                currNode = nextNode;
            };
            while (!isLeaf(currNode)) {
                _loop_1();
            }
            return currNode.leaf;
        })
            .reduce(function (score, boosterScore) { return score + boosterScore; }, 0.0);
        return sigmoid(totalScore);
    };
    Scorer.prototype.score = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (typeof input !== "string" && typeof input !== "object") {
                    throw new Error("Invalid input to score method: ".concat(input, ", expected string or object, was ").concat(typeof input));
                }
                // Scoring a single instance or array of instances
                if (typeof input === "object") {
                    if (Array.isArray(input)) {
                        return [2 /*return*/, input.map(function (en) { return _this.scoreSingleInstance(en); })];
                    }
                    else {
                        return [2 /*return*/, this.scoreSingleInstance(input)];
                    }
                }
                if (!this.reverseFeatureIndex) {
                    throw new Error("Cannot score LibSVM input without a feature index, please specify one while creating a scorer.");
                }
                // Scoring a LibSVM data file
                // const fs = await import("fs");
                // const readline = await import("readline");
                // const inputStream = fs.createReadStream(input);
                // const rl = readline.createInterface({
                //   input: inputStream,
                //   crlfDelay: Infinity
                // })
                // let scores = [];
                // for await (const line of rl) {
                //   const features: Record<string, number> =
                //     line
                //       .split(" ")
                //       .slice(1)
                //       .map(p => p.split(":"))
                //       .map(([featureId, value]) => [(this.reverseFeatureIndex as ReverseFeatureIndex)[featureId], value])
                //       .reduce((featureMap: Record<string, number>, entry: Array<string>) => {
                //         const [ featureName, featureValue ] = entry;
                //         featureMap[featureName] = parseFloat(featureValue);
                //         return featureMap;
                //       }, {});
                //   const score = this.scoreSingleInstance(features);
                //   scores.push(score);
                // }
                return [2 /*return*/, []];
            });
        });
    };
    return Scorer;
}());
export default Scorer;
