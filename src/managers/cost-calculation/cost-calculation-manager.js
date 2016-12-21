'use strict'

var ObjectId = require("mongodb").ObjectId;

require('mongodb-toolkit');

var DLModels = require('dl-models');
var map = DLModels.map;
var CostCalculation = DLModels.costCalculation.CostCalculation;

module.exports = class CostCalculationManager {

    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.CostCalculationCollection = this.db.use('cost-calculation');
    }
    create(costCalculation) {
        return new Promise((resolve, reject) => {
            this._validate(costCalculation)
                .then(validCostCalculation => {
                    this.CostCalculationCollection.insert(validCostCalculation)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    update(costCalculation) {
        return new Promise((resolve, reject) => {
            this._validate(costCalculation)
                .then(validCostCalculation => {
                    this.CostCalculationCollection.update(validCostCalculation)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    post(costCalculation) {
        return new Promise((resolve, reject) => {
            this._validate(costCalculation)
                .then(validCostCalculation => {
                    validCostCalculation.isPosted = true;
                    this.CostCalculationCollection.update(validCostCalculation)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    delete(costCalculation) {
        return new Promise((resolve, reject) => {
            this._validate(costCalculation)
                .then(validCostCalculation => {
                    validCostCalculation._deleted = true;
                    this.CostCalculationCollection.update(validCostCalculation)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _validate(costCalculation) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = costCalculation;

            var getCostCalculationPromise = this.CostCalculationCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        SJNo: valid.SJNo
                    }]
            });
            // 1. end: Declare promises.

            // 2. begin: Validation.
            Promise.all([getCostCalculationPromise])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();
                    
                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('module-toolkit').ValidationError ;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (!valid.stamp)
                        valid = new CostCalculation(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : deleted;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterSJNo = {
                    'SJNo': {
                        '$regex': regex
                    }
                };
                var filterRefSJNo = {
                    'RefSJNo': {
                        '$regex': regex
                    }
                };
                var filterSupplier = {
                    'supplier.name': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterSJNo, filterRefSJNo, filterSupplier]
                };

                query['$and'].push($or);
            }

            this.CostCalculationCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(costCalculations => {
                    resolve(costCalculations);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(costCalculation => {
                    resolve(costCalculation);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQueryOrDefault(query)
                .then(costCalculation => {
                    resolve(costCalculation);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.CostCalculationCollection
                .single(query)
                .then(costCalculation => {
                    resolve(costCalculation);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleByQueryOrDefault(query) {
        return new Promise((resolve, reject) => {
            this.CostCalculationCollection
                .singleOrDefault(query)
                .then(costCalculation => {
                    resolve(costCalculation);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }
}