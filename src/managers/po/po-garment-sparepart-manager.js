'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var POGarmentSparepart = DLModels.po.POGarmentSparepart;

module.export = class POGarmentSparepartManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.POGarmentSparepartCollection = this.db.use(map.po.POGarmentSparepart);
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
                var filterPRNo = {
                    'PRNo': {
                        '$regex': regex
                    }
                };
                var filterPONo = {
                    'PONo': {
                        '$regex': regex
                    }
                };

                var $or = {
                    '$or': [filterRONo, filterPRNo, filterPONo]
                };

                query['$and'].push($or);
            }


            this.POGarmentSparepartCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(POGarmentSpareparts => {
                    resolve(POGarmentSpareparts);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    readByPOGarmentSparepartId(POGarmentSparepartId, paging) {
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
            var POGarmentSparepart = {
                POGarmentSparepartId: new ObjectId(POGarmentSparepartId)
            };
            var query = {
                '$and': [deleted, module]
            };

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterRONo = {
                    'RONo': {
                        '$regex': regex
                    }
                };
                var filterPRNo = {
                    'PRNo': {
                        '$regex': regex
                    }
                };
                var filterPONo = {
                    'PONo': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterRONo, filterPRNo, filterPONo]
                };

                query['$and'].push($or);
            }


            this.POGarmentSparepartCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(POGarmentSparepart => {
                    resolve(POGarmentSparepart);
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

    getByFKPO(RONo, PRNo, PONo) {
        return new Promise((resolve, reject) => {
            if (code === '')
                resolve(null);
            var query = {
                RONo: RONo,
                PRNo: PRNo,
                PONo: PONo,
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
            this.POGarmentSparepartCollection
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
            this.POGarmentSparepartCollection
                .singleOrDefault(query)
                .then(fabric => {
                    resolve(fabric);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(POGarmentSparepart) {
        return new Promise((resolve, reject) => {
            this._validate(POGarmentSparepart)
                .then(validPOGarmentSparepart => {
                    this.POGarmentSparepartCollection.insert(validPOGarmentSparepart)
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

    update(POGarmentSparepart) {
        return new Promise((resolve, reject) => {
            this._validate(POGarmentSparepart)
                .then(validPOGarmentSparepart => {
                    this.POGarmentSparepartCollection.update(validPOGarmentSparepart)
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

    delete(POGarmentSparepart) {
        return new Promise((resolve, reject) => {
            this._validate(POGarmentSparepart)
                .then(validPOGarmentSparepart => {
                    validPOGarmentSparepart._deleted = true;
                    this.POGarmentSparepartCollection.update(validPOGarmentSparepart)
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

    _validate(POGarmentSparepart) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new POGarmentSparepart(POGarmentSparepart);

            // 1. begin: Declare promises.
            var getPOGarmentSparepartPromise = this.POGarmentSparepartCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        // code: valid.code
                    }]
            });

            // 1. end: Declare promises.

            var getByFKPOData = this.getByFKPO(POGarmentSparepart.RONo, POGarmentSparepart.PRNo, POGarmentSparepart.POGarmentSparepart)
            // 2. begin: Validation.
            Promise.all([getPOGarmentSparepartPromise, getByFKPOData])
                .then(results => {
                    var _module = results[0];
                    var _FKPO = results[1];

                    if (!valid.RONo || valid.RONo == '')
                        errors["RONo"] = "Nomor RO tidak boleh kosong";
                    if (!valid.PRNo || valid.PRNo == '')
                        errors["PRNo"] = "Nomor PR tidak boleh kosong";
                    if (!valid.PONo || valid.PONo == '')
                        errors["PONo"] = "Nomor PO tidak boleh kosong";
                    if (!valid.supplierId || valid.supplierId == '')
                        errors["storageId"] = "Nama Supplier tidak boleh kosong";
                    if (!valid.deliveryDate || valid.deliveryDate == '')
                        errors["deliveryDate"] = "Tanggal Kirim tidak boleh kosong";
                    if (!valid.termOfPayment || valid.termOfPayment == '')
                        errors["termOfPayment"] = "Pembayaran tidak boleh kosong";
                    if (!valid.deliveryFeeByBuyer || valid.deliveryFeeByBuyer == '')
                        errors["deliveryFeeByBuyer"] = "Pilih salah satu ongkos kirim";
                    if (!valid.description || valid.description == '')
                        errors["description"] = "Keterangan tidak boleh kosong";
                    if (_FKPO) {
                        errors["code"] = "RO, PR, da already exists";
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

};