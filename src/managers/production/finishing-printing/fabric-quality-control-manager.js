"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');

var generateCode = require("../../../utils/code-generator");

var ProductionOrderManager = require('../../sales/production-order-manager');
var KanbanManager = require('./kanban-manager');
var UomManager = require('../../master/uom-manager');

var Models = require("dl-models");
var Map = Models.map;
var KanbanModel = Models.production.finishingPrinting.Kanban;
var FabricQualityControlModel = Models.production.finishingPrinting.qualityControl.defect.FabricQualityControl;
var FabricGradeTestModel = Models.production.finishingPrinting.qualityControl.defect.FabricGradeTestModel;
var FabricTestCriterionModel = Models.production.finishingPrinting.qualityControl.defect.FabricTestCriterionModel;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class FabricQualityControlManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl);

        this.kanbanManager = new KanbanManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.uomManager = new UomManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var operatorFilter = {
                "operatorIm": {
                    "$regex": regex
                }
            };
            var machineFilter = {
                "machineNoIm": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [operatorFilter, machineFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(fabricQualityControl) {
        var errors = {};
        var valid = fabricQualityControl;

        var getDbFabricQualityControl = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });
        var getDuplicateFabricQualityControl = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getKanban = valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? this.kanbanManager.getSingleByIdOrDefault(valid.kanbanId) : Promise.resolve(null);

        return Promise.all([getDbFabricQualityControl, getDuplicateFabricQualityControl, getKanban])
            .then(results => {
                var _dbFabricQualityControl = results[0];
                var _duplicateFabricQualityControl = results[1];
                var _kanban = results[2];

                if (_dbFabricQualityControl)
                    valid.code = _dbFabricQualityControl.code; // prevent code changes.

                if (_duplicateFabricQualityControl)
                    errors["code"] = i18n.__("FabricQualityControl.code.isExist: %s is exist", i18n.__("FabricQualityControl.code._:Code"));

                if (!_kanban) {
                    errors["kanbanId"] = i18n.__("FabricQualityControl.kanbanId: %s not found", i18n.__("FabricQualityControl.KanbanId._:Kanban"));
                }

                if (valid.pointSystem !== 10 && valid.pointSystem !== 4)
                    errors["pointSystem"] = i18n.__("FabricQualityControl.pointSystem.invalid:%s is not valid", i18n.__("FabricQualityControl.pointSystem._:Point System")); //"Grade harus diisi";   

                if (!valid.dateIm)
                    errors["dateIm"] = i18n.__("FabricQualityControl.dateIm.isRequired:%s is required", i18n.__("FabricQualityControl.dateIm._:Date")); //"Grade harus diisi";

                if (!valid.shiftIm || valid.shiftIm === '')
                    errors["shiftIm"] = i18n.__("FabricQualityControl.shiftIm.isRequired:%s is required", i18n.__("FabricQualityControl.shiftIm._:Shift")); //"Grade harus diisi";   

                if (!valid.operatorIm || valid.operatorIm === '')
                    errors["operatorIm"] = i18n.__("FabricQualityControl.operatorIm.isRequired:%s is required", i18n.__("FabricQualityControl.operatorIm._:Operator IM")); //"Operator IM harus diisi";   

                if (!valid.machineNoIm || valid.machineNoIm === '')
                    errors["machineNoIm"] = i18n.__("FabricQualityControl.machineNoIm.isRequired:%s is required", i18n.__("FabricQualityControl.machineNoIm._:IM Machine No")); //"Grade harus diisi";   

                valid.fabricGradeTests = valid.fabricGradeTests || [];
                if (valid.fabricGradeTests && valid.fabricGradeTests.length <= 0) {
                    errors["fabricGradeTests"] = i18n.__("FabricQualityControl.fabricGradeTests.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests._: Fabric Grade Tests")); //"Harus ada minimal 1 barang";
                }
                else {

                    var fabricGradeTestsErrors = [];
                    valid.fabricGradeTests.forEach((item, index) => {
                        var fabricGradeTestsError = {};
                        if (!item.pcsNo || item.pcsNo.trim() === "")
                            fabricGradeTestsError["pcsNo"] = i18n.__("FabricQualityControl.fabricGradeTests.pcsNo.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Pcs No"));
                        else {
                            var dup = valid.fabricGradeTests.find((test, idx) => item.pcsNo === test.pcsNo && index != idx);
                            if (dup)
                                fabricGradeTestsError["pcsNo"] = i18n.__("FabricQualityControl.fabricGradeTests.pcsNo.isDuplicate:%s is duplicate", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Pcs No"));
                        }

                        if (item.initLength <= 0)
                            fabricGradeTestsError["initLength"] = i18n.__("FabricQualityControl.fabricGradeTests.initLength.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Initial Length"));

                        if (item.width <= 0)
                            fabricGradeTestsError["width"] = i18n.__("FabricQualityControl.fabricGradeTests.width.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.width._:Width"));


                        fabricGradeTestsErrors.push(fabricGradeTestsError);
                    })

                    for (var fabricGradeTestsError of fabricGradeTestsErrors) {
                        if (Object.getOwnPropertyNames(fabricGradeTestsError).length > 0) {
                            errors.fabricGradeTests = fabricGradeTestsErrors;
                            break;
                        }
                    }

                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid.fabricGradeTests.forEach(test => {
                    test.pointSystem = valid.pointSystem;
                    this.calculateGrade(test);
                });

                if (!valid.stamp) {
                    valid = new FabricQualityControlModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    calculateGrade(fabricGradeTest) {
        var multiplier = fabricGradeTest.pointSystem === 10 ? {
            A: 1,
            B: 3,
            C: 5,
            D: 10
        } : {
            A: 1,
            B: 2,
            C: 3,
            D: 4
        };
        fabricGradeTest.criteria = fabricGradeTest.criteria || [];
        var score = fabricGradeTest.criteria.reduce((p, c, i) => {
            return p + ((c.score.A * multiplier.A) + (c.score.B * multiplier.B) + (c.score.C * multiplier.C) + (c.score.D * multiplier.D))
        }, 0);

        var finalLength = fabricGradeTest.initLength - fabricGradeTest.avalLength - fabricGradeTest.sampleLength;
        var finalScore = finalLength > 0 ? score / finalLength : 0;
        var grade = this.__scoreGrade(fabricGradeTest.pointSystem, finalScore);

        fabricGradeTest.score = score;
        fabricGradeTest.finalLength = finalLength;
        fabricGradeTest.finalScore = finalScore;
        fabricGradeTest.grade = grade;
    }

    __scoreGrade(pointSystem, finalScore) {
        if (pointSystem === 10) {
            if (finalScore >= 2.71)
                return "BS";
            else if (finalScore >= 1.31)
                return "C";
            else if (finalScore >= 0.91)
                return "B";
            else
                return "A";
        }
        else
            return "-";
    }
};
