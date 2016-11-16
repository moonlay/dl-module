'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var WindingQualitySampling = DLModels.production.spinning.winding.WindingQualitySampling;
var ProductManager = require('../../../master/product-manager');
var MachineManager = require('../../../master/machine-manager');
var UsterManager = require('../../../master/uster-classification-manager');
var BaseManager = require('../../../base-manager');
var i18n = require('dl-i18n');


module.exports = class WindingQualitySamplingManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.collection(map.production.spinning.winding.collection.WindingQualitySampling);
        this.productManager = new ProductManager(db, user);
        this.machineManager = new MachineManager(db, user);
        this.usterManagerIpiLess = new UsterManager(db, user);
        this.usterManagerIpiGreat = new UsterManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterSpinning = {
                'spinning': {
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
                "thread.code": {
                    '$regex': regex
                }
            };
            var filterThreadName = {
                "thread.name": {
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

    _validate(windingQualitySampling) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = windingQualitySampling;
            var dateNow = new Date();
            var dateProcess = new Date(valid.date);
            
            var getWindingQuality = this.collection.singleOrDefault({
                "$and" : [{
                        _id : {
                            "$ne" : new ObjectId(valid._id)
                    }
                    },{
                        _deleted : false
                    },{
                        date : dateProcess
                    },{
                        threadName : valid.threadName
                    },{
                        machineId : new ObjectId(valid.machineId)
                    },{
                        spinning : valid.spinning
                }]
            });
            var getMachine = valid.machine && valid.machine._id ? this.machineManager.getSingleByIdOrDefault(valid.machine._id) : Promise.resolve(null);
            var _ipi = (!valid.thin ? 0 : valid.thin) + (!valid.thick ? 0 : valid.thick) + (!valid.neps ? 0 : valid.neps);
            var queryGreat = {
                size : 1,
                page : 1,
                filter : {
                    '$and' : [{
                        threadName : valid.threadName
                    },{
                        ipi : {'$gte' : _ipi}
                    }]
                },
                order : {
                    "ipi" : 1
                }
            };
            var queryLess = {
                size : 1,
                page : 1,
                filter : {
                    '$and' : [{
                        threadName : valid.threadName
                    },{
                        ipi : {'$lt' : _ipi}
                    }]
                },
                order : {
                    "ipi" : -1
                }
            };
            var getUsterGreaterThenIpi = valid.threadName ? this.usterManagerIpiGreat.read(queryGreat) : Promise.resolve(null);
            var getUsterLessThenIpi = valid.threadName ? this.usterManagerIpiLess.read(queryLess) : Promise.resolve(null);
            
            // 2. begin: Validation.
            Promise.all([getWindingQuality, getMachine, getUsterLessThenIpi, getUsterGreaterThenIpi])
                .then(result =>{
                    var _windingQuality = result[0];
                    var _machine = result[1];
                    var _usterGreatThen = null;
                    var _usterLessThen = null;
                    if(result[2].data.length > 0){
                        for(var a of result[2].data)
                            _usterLessThen = a;
                    }
                    if(result[3].data.length > 0){
                        for(var a of result[3].data)
                            _usterGreatThen = a;
                    }
                    if (!valid.spinning || valid.spinning == '')
                        errors["spinning"] = i18n.__("WindingQualitySampling.spinning.isRequired:%s is required", i18n.__("WindingQualitySampling.spinning._:Spinning")); //"Spinning harus diisi ";
                    else if(_windingQuality)
                        errors["spinning"] = i18n.__(`WindingQualitySampling.spinning.isRequired:%s with same Product, Machine and Date is already exists`, i18n.__("WindingQualitySampling.spinning._:Spinning")); //"Spinning dengan produk, mesin dan tanggal yang sama tidak boleh";

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("WindingQualitySampling.date.isExists:%s is required", i18n.__("WindingQualitySampling.date._:date")); //"Tanggal tidak boleh kosong";
                    else if (dateProcess > dateNow)
                        errors["date"] = i18n.__("WindingQualitySampling.date.isGreater:%s is greater than today", i18n.__("WindingQualitySampling.date._:Date"));//"Tanggal tidak boleh lebih besar dari tanggal hari ini";

                    if (!valid.machine)
                        errors["machine"] = i18n.__("WindingQualitySampling.machine.name.isRequired:%s is required", i18n.__("WindingQualitySampling.machine.name._:Machine")); //"Nama Mesin tidak boleh kosong";
                    else if(!_machine)
                        errors["machine"] = i18n.__("WindingQualitySampling.machine.name.isRequired:%s is not exists", i18n.__("WindingQualitySampling.machine.name._:Machine")); //"Mesin sudah tidak ada di master mesin";

                    if (!valid.threadName)
                        errors["threadName"] = i18n.__("WindingQualitySampling.threadName.isRequired:%s is required", i18n.__("WindingQualitySampling.threadName._:Thread")); //"Nama Benang tidak boleh kosong";
                    else if(!_usterGreatThen && !_usterLessThen)
                        errors["threadName"] = i18n.__("WindingQualitySampling.threadName.isRequired:%s has no uster classification", i18n.__("WindingQualitySampling.threadName._:Thread")); //"Benang tidak memiliki klassifikasi Uster";


                    if (!valid.U || valid.U == 0)
                        errors["U"] = i18n.__("WindingQualitySampling.U.isRequired:%s is required", i18n.__("WindingQualitySampling.U._:U")); //"U tidak boleh kosong";

                    if (!valid.sys || valid.sys == 0)
                        errors["sys"] = i18n.__("WindingQualitySampling.sys.isRequired:%s is required", i18n.__("WindingQualitySampling.sys._:Sys")); //"Sys tidak boleh kosong";

                    if (!valid.elongation || valid.elongation == 0)
                        errors["elongation"] = i18n.__("WindingQualitySampling.elongation.isRequired:%s is required", i18n.__("WindingQualitySampling.elongation._:Elongation")); //"Elongation tidak boleh kosong";

                    // 2c. begin: check if data has any error, reject if it has.
                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }
                    valid.machine = _machine;
                    valid.machineId = new ObjectId(_machine._id);
                    if(_usterGreatThen){
                        valid.uster = _usterGreatThen;
                        valid.usterId = new ObjectId(_usterGreatThen._id);
                    }else if(_usterLessThen){
                        valid.uster = _usterLessThen;
                        valid.usterId = new ObjectId(_usterLessThen._id);
                    }
                    if(valid.date)
                        valid.date = dateProcess;
                    valid.ipi = _ipi;
                    
                    if(!valid.stamp)
                        valid = new WindingQualitySampling(valid);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    getWindingQualitySamplingReportByDate(startDate, endDate){
        return new Promise((resolve, reject) => {
            var now = new Date();
            var query = {};
            if(startDate && !endDate){
                query = {
                    "date" : {
                        "$gte" : new Date(startDate)
                    }
                };
            }else if(!startDate && endDate){
                query = {
                    "date" : {
                        "$lte" : new Date(endDate)
                    }
                };
            }else if(startDate && endDate){
                query = {
                    "$and" : [{
                        "date":{
                            "$gte" : new Date(startDate)
                        }
                    },{
                        "date" : {
                            "$lte" : new Date(endDate)
                        }
                    }]
                };
            }else if(!startDate && !endDate){
                query = {
                    "$and" : [{
                        "date":{
                            "$gte" : new Date(1900, 1, 1)
                        }
                    },{
                        "date" : {
                            "$lte" : now
                        }
                    }]
                };
            }
            var order = {
                "date" : -1
            };

            this.collection
                .where(query)
                .order(order)
                .execute()
                .then(Spinning => {
                    resolve(Spinning.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

     _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.spinning.winding.collection.WindingQualitySampling}__updatedDate`,

            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${map.production.spinning.winding.collection.WindingQualitySampling}_spinning_date_machineId_threadName`,
            key: {
                spinning: 1,
                date: 1,
                machineId: 1,
                threadName: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}