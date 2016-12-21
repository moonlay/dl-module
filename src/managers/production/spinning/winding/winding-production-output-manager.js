'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var WindingProductionOutput = DLModels.production.spinning.winding.WindingProductionOutput;
var ProductManager = require('../../../master/product-manager');
var MachineManager = require('../../../master/machine-manager');
var UnitManager = require('../../../master/unit-manager');
var ThreadSpecificationManager = require('../../../master/thread-specification-manager');
var LotMachineManager = require('../../../master/lot-machine-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var DailySpinningProductionReportManager = require('../daily-spinning-production-report-manager');

module.exports = class WindingProductionOutputManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.spinning.winding.collection.WindingProductionOutput);
        this.productManager = new ProductManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.unitManager = new UnitManager(db, user);
        this.lotmachineManager = new LotMachineManager(db, user);
        this.threadSpecificationManager = new ThreadSpecificationManager(db, user);
        this.dailySpinningProductionReportManager = new DailySpinningProductionReportManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterSpinning = {
                'unit.name': {
                    '$regex': regex
                }
            };
            var filterMachineCode = {
                "machine.code": {
                    '$regex': regex
                }
            };
            var filterMachineName = {
                'machine.name': {
                    '$regex': regex
                }
            };
            var filterThreadCode = {
                "product.code": {
                    '$regex': regex
                }
            };
            var filterThreadName = {
                "product.name": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterSpinning, filterMachineCode, filterMachineName, filterThreadCode, filterThreadName]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }    

    _validate(windingProductionOutput) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = windingProductionOutput;
            // 1. begin: Declare promises.
            var getWindingProductionOutputPromise = this.collection.singleOrDefault({
                    "$and" : [{
                        _id : {
                            "$ne" : new ObjectId(valid._id)
                    }
                    },{
                        _deleted : false
                    },{
                        date : valid.date
                    },{
                        productId : valid.productId && ObjectId.isValid(valid.productId) ? (new ObjectId(valid.productId)) : ''
                    },{
                        machineId : valid.machine && ObjectId.isValid(valid.machine._id) ? (new ObjectId(valid.machine._id)) : ''
                    },{
                        shift : valid.shift
                    },{
                        unitId : valid.unitId && ObjectId.isValid(valid.unitId) ? (new ObjectId(valid.unitId)) : ''
                }]
            });

            var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);
            var getMachine = valid.machineId && ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(valid.machineId) : Promise.resolve(null);
            var getUnit = valid.unitId && ObjectId.isValid(valid.unitId) ? this.unitManager.getSingleByIdOrDefault(valid.unitId) : Promise.resolve(null);
            var queryProduct=
            {
                filter : {
                        productId : ObjectId.isValid(valid.productId) ? new ObjectId(valid.productId) : ''
                }
            };
            var getLotMachine = valid.productId && ObjectId.isValid(valid.productId) ? this.lotmachineManager.read(queryProduct) : Promise.resolve(null);
            var getThreadSpecification = valid.productId && ObjectId.isValid(valid.productId) ? this.threadSpecificationManager.read(queryProduct) : Promise.resolve(null);
            Promise.all([getWindingProductionOutputPromise, getProduct, getMachine, getLotMachine, getThreadSpecification, getUnit])
             .then(results =>{
                var _module = results[0];
                var _product = results[1];
                var _machine = results[2];
                var _lotmachine = results[3];
                var _threadSpecification = results[4];
                var _unit= results[5];
                var _Lm=null;
                var _Ts=null;
                var now = new Date();
                
                valid.product=_product;

                if(_lotmachine.data.length > 0){
                    for(var a of _lotmachine.data)
                    {
                        if(a.productId==valid.productId && a.machineId==valid.machineId) {
                        // if(a._id.toString() == valid.lotMachineId.toString()) {
                            _Lm = a;
                            break;
                        }
                    }
                }

                if(_threadSpecification.data.length > 0){
                    for(var b of _threadSpecification.data)
                    {
                        if(b.productId==valid.productId) {
                        // if(b._id.toString() == valid.threadSpecificationId.toString()) {
                            _Ts = b;
                            break;
                        }
                    }
                }
                
                if(_module){
                    errors["shift"] = i18n.__(`WindingProductionOutput.shift.isRequired:%s with same Product, Machine, Spinning and Date is already exists`, i18n.__("WindingQualitySampling.shift._:Shift")); //"Spinning dengan produk, mesin dan tanggal,shift,dan mesin yang sama tidak boleh";
                }
                   
                if (!valid.shift || valid.shift == '')
                    errors["shift"] = i18n.__("WindingProductionOutput.shift.isRequired:%s is required", i18n.__("WindingProductionOutput.shift._:Shift"));

                if (!_unit)
                    errors["unit"] = i18n.__("WindingProductionOutput.unit.isRequired:%s is not exists", i18n.__("WindingProductionOutput.unit._:Unit")); 
                
                else if (!valid.unitId)
                    errors["unit"] = i18n.__("WindingProductionOutput.unit.isRequired:%s is required", i18n.__("WindingProductionOutput.unit._:Unit"));
                else if (valid.unit) {
                    if (!valid.unit._id)
                        errors["unit"] = i18n.__("WindingProductionOutput.unit.isRequired:%s is required", i18n.__("WindingProductionOutput.unit._:Unit"));
                
                }
                

                if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("WindingProductionOutput.date.isRequired:%s is required", i18n.__("WindingProductionOutput.date._:Date")); 

                if (!valid.threadWeight || valid.threadWeight == 0)
                        errors["threadWeight"] = i18n.__("WindingProductionOutput.threadWeight.isRequired:%s is required", i18n.__("WindingProductionOutput.threadWeight._:ThreadWeight")); 
                
                if (!valid.goodCone || valid.goodCone == 0)
                        errors["goodCone"] = i18n.__("WindingProductionOutput.goodCone.isRequired:%s is required", i18n.__("WindingProductionOutput.goodCone._:GoodCone")); 
                
                if (!valid.drum || valid.drum == 0)
                        errors["drum"] = i18n.__("WindingProductionOutput.drum.isRequired:%s is required", i18n.__("WindingProductionOutput.drum._:Drum")); 

                if (!_product)
                    errors["product"] = i18n.__("WindingProductionOutput.product.isRequired:%s is not exists", i18n.__("WindingProductionOutput.product._:Product")); 
                else if (!valid.productId)
                    errors["product"] = i18n.__("WindingProductionOutput.product.isRequired:%s is required", i18n.__("WindingProductionOutput.product._:Product"));
                else if (valid.product) {
                    if (!valid.product._id)
                        errors["product"] = i18n.__("WindingProductionOutput.product.isRequired:%s is required", i18n.__("WindingProductionOutput.product._:Product"));
                
                }
                
                if (!_machine)
                    errors["machine"] = i18n.__("WindingProductionOutput.machine.isRequired:%s is not exists", i18n.__("WindingProductionOutput.machine._:Machine")); 
                else if (!valid.productId)
                    errors["machine"] = i18n.__("WindingProductionOutput.machine.isRequired:%s is required", i18n.__("WindingProductionOutput.machine._:Machine"));
                else if (valid.machine) {
                    if (!valid.machine._id)
                        errors["machine"] = i18n.__("WindingProductionOutput.machine.isRequired:%s is required", i18n.__("WindingProductionOutput.machine._:Machine"));
                }

                if(_Lm)
                {
                    valid.lotMachine=_Lm;
                    valid.lotMachineId=new ObjectId(_Lm._id);
                }
                if(_Ts)
                {
                    valid.threadSpecification=_Ts;
                    valid.threadSpecificationId=new ObjectId(_Ts._id);
                }

                if (!_Lm)
                    errors["lotMachine"] = i18n.__("WindingProductionOutput.lotMachine.isRequired:%s is not exists", i18n.__("WindingProductionOutput.lotMachine._:LotMachine")); 
                else if (!valid.lotMachineId)
                    errors["lotMachine"] = i18n.__("WindingProductionOutput.lotMachine.isRequired:%s is required", i18n.__("WindingProductionOutput.lotMachine._:LotMachine"));
                else if (valid.lotMachine) {
                    if (!valid.lotMachine._id)
                        errors["lotMachine"] = i18n.__("WindingProductionOutput.lotMachine.isRequired:%s is required", i18n.__("WindingProductionOutput.lotMachine._:LotMachine"));
                }

                if (!_Ts)
                    errors["threadSpecification"] = i18n.__("WindingProductionOutput.threadSpecification.isRequired:%s is not exists", i18n.__("WindingProductionOutput.threadSpecification._:ThreadSpecification")); 
                else if (!valid.threadSpecificationId)
                    errors["threadSpecification"] = i18n.__("WindingProductionOutput.threadSpecification.isRequired:%s is required", i18n.__("WindingProductionOutput.threadSpecification._:ThreadSpecification"));
                else if (valid.threadSpecification) {
                    if (!valid.threadSpecification._id)
                        errors["threadSpecification"] = i18n.__("WindingProductionOutput.threadSpecification.isRequired:%s is required", i18n.__("WindingProductionOutput.threadSpecification._:ThreadSpecification"));
                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError ;
                    reject(new ValidationError('data does not pass validation', errors));
                }
                valid.unitId=new ObjectId(_unit._id);
                valid.machineId=new ObjectId(_machine._id);
                valid.productId=new ObjectId(_product._id);

                valid = new WindingProductionOutput(windingProductionOutput);
                valid.stamp(this.user.username, 'manager');
                resolve(valid);
             })
             .catch(e => {
                    reject(e);
                })
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.spinning.winding.collection.WindingProductionOutput}__updatedDate`,

            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.production.spinning.winding.collection.WindingProductionOutput}_unitId_date_shift_machineId_productId`,
            key: {
                unitId: 1,
                date: 1,
                shift:1,
                machineId: 1,
                productId: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    create(data) {
        var _outputId;
        return new Promise((resolve, reject) => {
            super.create(data)
            .then(id => {
                _outputId = id;
                this.dailySpinningProductionReportManager.addOutput(data)
                    .then(result => {
                        resolve(id);
                    })
                    .catch(e => {
                        reject(e);
                    })
            })
            .catch(e => {
                var p = [];
                if (_outputId)
                    p.push(this._delete(_outputId));

                    Promise.all(p)
                        .then(results => {
                            reject(e);
                        })
                        .catch(e => {
                            reject(e);
                        });
            })
        });
    }
}