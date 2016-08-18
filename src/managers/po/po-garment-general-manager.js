'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var POGarmentGeneral = DLModels.po.POGarmentGeneral;

module.exports = class POGarmentGeneralManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.POGarmentGeneralCollection = this.db.use(map.po.collection.PurchaseOrder);
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
    
    readHavePODL(paging) {
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
            
            var poDLNotEmpty = {
                'PODLNo': {
                    '$ne' : ''
                }
            };
            
            var query = {
                '$and': [deleted, poDLNotEmpty]
            };

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
        return new Promise((resolve, reject) => {
            this._validate(poGarmentGeneral)
                .then(validPOGarmentGeneral => {
                    this.POGarmentGeneralCollection.insert(validPOGarmentGeneral)
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

    update(poGarmentGeneral) {
        return new Promise((resolve, reject) => {
            this._validate(poGarmentGeneral)
                .then(validPOGarmentGeneral => {
                    this.POGarmentGeneralCollection.update(validPOGarmentGeneral)
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

    delete(poGarmentGeneral) {
        return new Promise((resolve, reject) => {
            this._validate(poGarmentGeneral)
                .then(validPOGarmentGeneral => {
                    validPOGarmentGeneral._deleted = true;
                    this.POGarmentGeneralCollection.update(validPOGarmentGeneral)
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
    
    _validate(poGarmentGeneral) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new POGarmentGeneral(poGarmentGeneral);

            // 1. begin: Declare promises.
            var getPOGarmentGeneralPromise = this.POGarmentGeneralCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        // code: valid.code
                    }]
            });

            // 1. end: Declare promises.

            // 2. begin: Validation.
            // Promise.all([getPOGarmentGeneralPromise, getByFKPOData])
            Promise.all([getPOGarmentGeneralPromise])
                .then(results => {
                    var _module = results[0];
                    //  var _FKPO = results[1];

                    if (!valid.RONo || valid.RONo == '')
                        errors["RONo"] = "Nomor RO tidak boleh kosong";
                    if (!valid.RefPONo || valid.RefPONo == '')
                        errors["RefPONo"] = "Nomor PO tidak boleh kosong";
                    if (!valid.supplierId || valid.supplierId == '')
                        errors["supplierId"] = "Nama Supplier tidak boleh kosong";
                    if (!valid.deliveryDate || valid.deliveryDate == '')
                        errors["deliveryDate"] = "Tanggal Kirim tidak boleh kosong";
                    if (!valid.termOfPayment || valid.termOfPayment == '')
                        errors["termOfPayment"] = "Pembayaran tidak boleh kosong";
                    if (!valid.deliveryFeeByBuyer || valid.deliveryFeeByBuyer == '')
                        errors["deliveryFeeByBuyer"] = "Pilih salah satu ongkos kirim";
                    if (_module) {
                        errors["code"] = "RO, PO already exists";
                    }

                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
}