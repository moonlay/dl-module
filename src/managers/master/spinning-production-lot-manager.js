'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var SpinningProductionLot = DLModels.master.SpinningProductionLot;
//var ProductManager = require('../master/product-manager');
var MachineManager = require('../master/machine-manager');
var SpinningYarnManager = require('../master/spinning-yarn-manager');
var UnitManager = require('../master/unit-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class SpinningProductionLotManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.SpinningProductionLot);
        //this.productManager = new ProductManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.spinningYarnManager = new SpinningYarnManager(db, user);
        this.unitManager = new UnitManager(db, user);
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
            var lotFilter = {
                'lot': {
                    '$regex': regex
                }
            };
            var machineNameFilter = {
                'machine.name': {
                    '$regex': regex
                }
            };
            var yarnNameFilter = {
                'spinningYarn.name': {
                    '$regex': regex
                }
            };
            var unitNameFilter = {
                'unit.name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [lotFilter, machineNameFilter, yarnNameFilter, unitNameFilter ];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(yarn) {
        yarn._active = true;
        yarn._createdDate= new Date();
        return Promise.resolve(yarn);
    }

    _validate(lotProduction) {
        var errors = {};
        var valid = lotProduction;
        // 1. begin: Declare promises.
        var getProductionLotPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            spinningYarnId: new ObjectId(valid.spinningYarn._id),
            machineId: new ObjectId(valid.machine._id),
            unitId: new ObjectId(valid.unit._id),
            lot: valid.lot,
            _deleted: false
        });

        //var getProduct = ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(valid.productId)) : Promise.resolve(null);
        var getMachine = ObjectId.isValid(valid.machine._id) ? this.machineManager.getSingleByIdOrDefault(new ObjectId(valid.machine._id)) : Promise.resolve(null);
        var getUnit = ObjectId.isValid(valid.unit._id) ? this.unitManager.getSingleByIdOrDefault(new ObjectId(valid.unit._id)) : Promise.resolve(null);
        var getSpinningYarn = ObjectId.isValid(valid.spinningYarn._id) ? this.spinningYarnManager.getSingleByIdOrDefault(new ObjectId(valid.spinningYarn._id)) : Promise.resolve(null);

        return Promise.all([getProductionLotPromise, getSpinningYarn, getMachine, getUnit])
            .then(results => {
                var _lot = results[0];
                var _yarn = results[1];
                var _machine = results[2];
                var _unit = results[3];

                if (_lot) {
                    errors["spinningYarnId"] = i18n.__("SpinningProductionLot.spinningYarn.isExists:%s is exists", i18n.__("SpinningProductionLot.spinningYarn._:SpinningYarn"));
                    errors["machineId"] = i18n.__("SpinningProductionLot.machine.isExists:%s is exists", i18n.__("SpinningProductionLot.machine._:Machine"));
                    errors["unitId"] = i18n.__("SpinningProductionLot.unit.isExists:%s is exists", i18n.__("SpinningProductionLot.unit._:Unit"));
                    errors["lot"] = i18n.__("SpinningProductionLot.lot.isExists:%s is exists", i18n.__("SpinningProductionLot.lot._:Lot"));
                }

                if(_machine.unit){
                    if(_machine.unit.code != _unit.code){
                        errors["machineId"] = i18n.__("SpinningProductionLot.machine.shouldNot:%s unit is not matched with lot unit ", i18n.__("SpinningProductionLot.machine._:Machine"));
                        errors["unitId"] = i18n.__("SpinningProductionLot.unit.shouldNot:%s is not matched with machine unit", i18n.__("SpinningProductionLot.unit._:Unit"));
                    }
                }

                // if (!_product) {
                //     errors["productId"] = i18n.__("SpinningProductionLot.product.isRequired:%s is not exists", i18n.__("SpinningProductionLot.product._:Product"));
                // }

                if (!_machine)
                    errors["machineId"] = i18n.__("SpinningProductionLot.machine.isRequired:%s is not exists", i18n.__("SpinningProductionLot.machine._:Machine"));

                if (!valid.lot || valid.lot == '')
                    errors["lot"] = i18n.__("SpinningProductionLot.lot.isRequired:%s is required", i18n.__("SpinningProductionLot.lot._:Lot")); //"Lot Harus diisi";
                
                if (!_unit)
                    errors["unitId"] = i18n.__("SpinningProductionLot.unit.isRequired:%s is not exists", i18n.__("SpinningProductionLot.unit._:Unit"));

                if (!_yarn)
                    errors["spinningYarnId"] = i18n.__("SpinningProductionLot.spinningYarn.isRequired:%s is not exists", i18n.__("SpinningProductionLot.spinningYarn._:SpinningYarn"));


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if(_machine){
                    valid.machine=_machine;
                    valid.machineId= new ObjectId(_machine._id);
                }
                if(_unit){
                    valid.unit=_unit;
                    valid.unitId= new ObjectId(_unit._id);
                }
                if(_yarn){
                    valid.spinningYarn=_yarn;
                    valid.spinningYarnId= new ObjectId(_yarn._id);
                }

                valid = new SpinningProductionLot(valid);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.SpinningProductionLot}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.SpinningProductionLot}__lot`,
            key: {
                lot: 1
            }
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
