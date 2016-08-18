'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var PurchaseOrderManager = require("./purchase-order-manager");
var DLModels = require('dl-models');
var map = DLModels.map;
var POGarmentSparepart = DLModels.po.POGarmentSparepart;

module.exports = class POGarmentSparepartManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
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
                _type: map.po.type.POGarmentSparepart
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

                // var filterPODL = {
                //     'PODL': {
                //         '$regex': regex
                //     }
                // };

                var $or = {
                    '$or': [filterRONo, filterRefPONo, filterPONo]
                };

                query['$and'].push($or);
            }

            this.purchaseOrderManager.PurchaseOrderCollection
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

    getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);

            var query = {
                _id: new ObjectId(id),
                _deleted: false,
                _type: map.po.type.POGarmentSparepart
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
            // if (code === '')
            //     resolve(null);
            var query = {
                RONo: RONo,
                PRNo: PRNo,
                PONo: PONo,
                _deleted: false,
                _type: map.po.type.POGarmentSparepart
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

    getByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false,
                _type: map.po.type.POGarmentSparepart
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
           this.purchaseOrderManager.PurchaseOrderCollection
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
            this.purchaseOrderManager.PurchaseOrderCollection
                .singleOrDefault(query)
                .then(POGarmentSpareparts => {
                    resolve(POGarmentSpareparts);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(poGarmentSparepart) {
        poGarmentSparepart = new POGarmentSparepart(poGarmentSparepart);
        return new Promise((resolve, reject) => {
            this.purchaseOrderManager.create(poGarmentSparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }
    update(poGarmentSparepart) {
        poGarmentSparepart = new POGarmentSparepart(poGarmentSparepart);
        return new Promise((resolve, reject) => {
            this.purchaseOrderManager.update(poGarmentSparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }

    delete(poGarmentSparepart) {
        poGarmentSparepart = new POGarmentSparepart(poGarmentSparepart);
        return new Promise((resolve, reject) => {
            this.purchaseOrderManager.delete(poGarmentSparepart)
                .then(id => {
                    resolve(id);
                })
                .catch(e => {
                    reject(e);
                })
        })
    }
}