'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var LotMachine = DLModels.master.LotMachine;
var ProductManager = require('../master/product-manager');
var MachineManager = require('../master/machine-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');

module.exports = class LotMachineManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.LotMachine);
        this.productManager = new ProductManager(db, user);
        this.machineManager = new MachineManager(db, user);
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
            var productNameFilter = {
                'product.name': {
                    '$regex': regex
                }
            };
            keywordFilter['$or'] = [lotFilter, machineNameFilter, productNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(lotMachine) {
        var errors = {};
        var valid = lotMachine;
        // 1. begin: Declare promises.
        var getLotMachinePromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            productId: new ObjectId(valid.productId),
            machineId: new ObjectId(valid.machineId)
        });

        var getProduct = ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(valid.productId)) : Promise.resolve(null);
        var getMachine = ObjectId.isValid(valid.machineId) ? this.machineManager.getSingleByIdOrDefault(new Object(valid.machineId)) : Promise.resolve(null);

        return Promise.all([getLotMachinePromise, getProduct, getMachine])
            .then(results => {
                var _lotMachine = results[0];
                var _product = results[1];
                var _machine = results[2];

                if (_lotMachine) {
                    errors["product"] = i18n.__("LotMachine.product.isExists:%s is exists", i18n.__("LotMachine.product._:Product"));
                    errors["machine"] = i18n.__("LotMachine.machine.isExists:%s is exists", i18n.__("LotMachine.machine._:Machine"));
                }

                if (!_product) {
                    errors["product"] = i18n.__("LotMachine.product.isRequired:%s is not exists", i18n.__("LotMachine.product._:Product"));
                }

                if (!_machine)
                    errors["machine"] = i18n.__("LotMachine.machine.isRequired:%s is not exists", i18n.__("LotMachine.machine._:Machine"));

                if (!valid.lot || valid.lot == '')
                    errors["lot"] = i18n.__("LotMachine.lot.isRequired:%s is required", i18n.__("LotMachine.lot._:Lot")); //"Lot Harus diisi";


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                valid = new LotMachine(lotMachine);
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    getLotbyMachineProduct(_productId, _machineId) {
        return new Promise((resolve, reject) => {
            var query = {
                "machineId": new ObjectId(_machineId),
                "productId": new ObjectId(_productId)
            };
            query = Object.assign(query, {
                _deleted: false
            });

            this.collection.find(query).toArray()
                .then(Lot => {
                    resolve(Lot);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.LotMachine}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.LotMachine}_productId_machineId`,
            key: {
                productId: 1,
                machineId: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
