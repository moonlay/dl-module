'use strict';

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Instruction = DLModels.master.Instruction;
var assert = require('assert');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");

module.exports = class InstructionManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Instruction);
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
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter, codeFilter];

        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = data.code ? data.code : generateCode();
        return Promise.resolve(data);
    }

    _validate(instruction) {
        var errors = {};
        var valid = instruction;
        // 1. begin: Declare promises.
        var getInstructionPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            _deleted: false,
            name: valid.name,
        });
        return Promise.all([getInstructionPromise])
            .then(results => {
                var _instruction = results[0];

                if (!valid.name || valid.name == "")
                    errors["name"] = i18n.__("Instruction.name.isRequired:%s is required", i18n.__("Instruction.name._:Name")); // "Nama harus diisi";
                else if (_instruction)
                    errors["name"] = i18n.__("Instruction.name.isExisted:%s is existed", i18n.__("Instruction.name._:Name")); //"Nama sudah ada";
                if (!valid.steps || valid.steps.length < 1) {
                    errors["steps"] = i18n.__("Instruction.steps.isRequired:%s is required", i18n.__("Instruction.steps._:Steps")); //"minimal harus ada 1 Step";
                }
                else {
                    var itemErrors = [];
                    for (var step of valid.steps) {
                        var itemError = {};
                        if (step.process == "" || !step.process) {
                            errors["steps"] = i18n.__("Instruction.steps.steps.isRequired:%s is required", i18n.__("Instruction.steps.steps._:Steps")); //"minimal harus ada 1 Step";
                        }
                        itemErrors.push(itemError);
                    }
                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.steps = itemErrors;
                            break;
                        }
                    }
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid = new Instruction(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);

            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Instruction}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };
        return this.collection.createIndexes([dateIndex]);
    }
};

