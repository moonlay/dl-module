'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var POGarmentGeneral = DLModels.po.POGarmentGeneral;
var PurchaseOrderGroup = DLModels.po.PurchaseOrderGroup;

var moduleId = 'POGG'

var poType = map.po.type.POGarmentGeneral;

var generateCode = require('../.././utils/code-generator');

module.exports = class POGarmentGeneralManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.POGarmentGeneralCollection = this.db.use(map.po.collection.PurchaseOrder);

        var PurchaseOrderGroupManager = require('./purchase-order-group-manager');
        this.purchaseOrderGroupManager = new PurchaseOrderGroupManager(db, user);

        var PurchaseOrderManager = require("./purchase-order-manager");
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);

        this.PurchaseOrderGroupCollection = this.db.use(map.po.collection.PurchaseOrderGroup);
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var filter = {
                _deleted: false,
                _type: poType
            };

            var query = _paging.keyword ? {
                '$and': [filter]
            } : filter;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterRONo = {
                    'RONo': {
                        '$regex': regex
                    }
                };
                var filterRefPONo = {
                    'RefPONo': {
                        '$regex': regex
                    }
                };
                var filterPONo = {
                    'PONo': {
                        '$regex': regex
                    }
                };

                var $or = {
                    '$or': [filterRONo, filterRefPONo, filterPONo]
                };

                query['$and'].push($or);
            }

            this.POGarmentGeneralCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(POGarmentGenerals => {
                    resolve(POGarmentGenerals);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readAllPurchaseOrderGroup(paging) {
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
                var filterPODLNo = {
                    'PODLNo': {
                        '$regex': regex
                    }
                };

                var $or = {
                    '$or': [filterPODLNo]
                };

                query['$and'].push($or);
            }

            this.PurchaseOrderGroupCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(PurchaseOrderGroups => {
                    resolve(PurchaseOrderGroups);
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
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByPONo(poNo) {
        return new Promise((resolve, reject) => {
            if (poNo === '')
                resolve(null);
            var query = {
                PONo: poNo,
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
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
            this.getSingleOrDefaultByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.POGarmentGeneralCollection
                .single(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleOrDefaultByQuery(query) {
        return new Promise((resolve, reject) => {
            this.POGarmentGeneralCollection
                .singleOrDefault(query)
                .then(fabric => {
                    resolve(fabric);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(poGarmentGeneral) {
        poGarmentGeneral = new POGarmentGeneral(poGarmentGeneral);
        return new Promise((resolve, reject) => {

            poGarmentGeneral.PONo = generateCode(moduleId)
            this.purchaseOrderManager.create(poGarmentGeneral)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })

        });
    }

    createGroup(items) {
        return new Promise((resolve, reject) => {
            var newPOGroup = new PurchaseOrderGroup()

            newPOGroup.PODLNo = generateCode('PODL/GG')
            newPOGroup._type = poType

            var _tasks = [];

            for (var item of items) {
                _tasks.push(this.getByPONo(item))
            }

            Promise.all(_tasks)
                .then(results => {
                    newPOGroup.items = results
                    this.purchaseOrderGroupManager.create(newPOGroup)
                        .then(id => {
                            for (var data of newPOGroup.items) {
                                data.PODLNo = newPOGroup.PODLNo
                                this.update(data)
                            }

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

    update(poGarmentGeneral) {
        poGarmentGeneral = new POGarmentGeneral(poGarmentGeneral);
        return new Promise((resolve, reject) => {

            this.purchaseOrderManager.update(poGarmentGeneral)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    delete(poGarmentGeneral) {
        poGarmentGeneral = new POGarmentGeneral(poGarmentGeneral);
        return new Promise((resolve, reject) => {

            poGarmentGeneral._deleted = true;
            this.purchaseOrderManager.delete(poGarmentGeneral)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    // _validate(poGarmentGeneral) {
    //     var errors = {};
    //     return new Promise((resolve, reject) => {
    //         var valid = new POGarmentGeneral(poGarmentGeneral);

    //         // 1. begin: Declare promises.
    //         var getPOGarmentGeneralPromise = this.POGarmentGeneralCollection.singleOrDefault({
    //             "$and": [{
    //                 _id: {
    //                     '$ne': new ObjectId(valid._id)
    //                 }
    //             }, {
    //                     RefPONo: valid.RefPONo
    //                 }]
    //         });

    //         // 1. end: Declare promises.

    //         // 2. begin: Validation.
    //         // Promise.all([getPOGarmentGeneralPromise, getByFKPOData])
    //         Promise.all([getPOGarmentGeneralPromise])
    //             .then(results => {
    //                 var _module = results[0];
    //                 //  var _FKPO = results[1];

    //                 // if (!valid.RONo || valid.RONo == '')
    //                 //     errors["RONo"] = "Nomor RO tidak boleh kosong";
    //                 // if (!valid.RefPONo || valid.RefPONo == '')
    //                 //     errors["RefPONo"] = "Nomor PO tidak boleh kosong";
    //                 // if (!valid.supplierId || valid.supplierId == '')
    //                 //     errors["supplierId"] = "Nama Supplier tidak boleh kosong";
    //                 // if (!valid.deliveryDate || valid.deliveryDate == '')
    //                 //     errors["deliveryDate"] = "Tanggal Kirim tidak boleh kosong";
    //                 // if (!valid.termOfPayment || valid.termOfPayment == '')
    //                 //     errors["termOfPayment"] = "Pembayaran tidak boleh kosong";
    //                 // if (_module) {
    //                 //     errors["RefPONo"] = "PO already exists";
    //                 // }

    //                 // 2c. begin: check if data has any error, reject if it has.
    //                 for (var prop in errors) {
    //                     var ValidationError = require('../../validation-error');
    //                     reject(new ValidationError('data po does not pass validation', errors));
    //                 }

    //                 valid.stamp(this.user.username, 'manager');
    //                 resolve(valid);
    //             })
    //             .catch(e => {
    //                 reject(e);
    //             })
    //     });
    // }
}