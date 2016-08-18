'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PO = DLModels.po.PurchaseOrder;

module.exports = class PurchaseOrderManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.PurchaseOrderCollection = this.db.use(map.po.collection.PurchaseOrder);
    }

    create(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrder)
                .then(validPurchaseOrder => {
                    this.PurchaseOrderCollection.insert(validPurchaseOrder)
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

    update(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrder)
                .then(validPurchaseOrder => {
                    this.PurchaseOrderCollection.update(validPurchaseOrder)
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

    delete(purchaseOrder) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrder)
                .then(validPurchaseOrder => {
                    validPurchaseOrder._deleted = true;
                    this.PurchaseOrderCollection.update(validPurchaseOrder)
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

    _validate(purchaseOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseOrder;

            var getPurchaseOrderPromise = this.PurchaseOrderCollection.singleOrDefault({
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
            Promise.all([getPurchaseOrderPromise])
                .then(results => {
                    var _module = results[0];
                    //  var _FKPO = results[1];
                    if (!valid.RefPONo || valid.RefPONo == '')
                        errors["RefPONo"] = "Nomor referensi PO tidak boleh kosong";
                    if (!valid.RONo || valid.RONo == '')
                        errors["RONo"] = "Nomor RO tidak boleh kosong";
                    // if (!valid.article || valid.article == '')
                    //     errors["article"] = "Article tidak boleh kosong";
                    // if (!valid.PRNo || valid.PRNo == '')
                    //     errors["PRNo"] = "Nomor PR tidak boleh kosong";
                    if (!valid.supplierId || valid.supplierId == '')
                        errors["supplierId"] = "Nama Supplier tidak boleh kosong";
                    if (!valid.deliveryDate || valid.deliveryDate == '')
                        errors["deliveryDate"] = "Tanggal Kirim tidak boleh kosong";
                    if (!valid.termOfPayment || valid.termOfPayment == '')
                        errors["termOfPayment"] = "Pembayaran tidak boleh kosong";
                    if (!valid.deliveryFeeByBuyer || valid.deliveryFeeByBuyer == '')
                        errors["deliveryFeeByBuyer"] = "Pilih salah satu ongkos kirim";
                    // if (!valid.description || valid.description == '')
                    //     errors["description"] = "Keterangan tidak boleh kosong";
                    // if (_module) {
                    //     errors["code"] = "RO, PR, PO already exists";
                    // }

                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (!valid.stamp)
                        valid = new PurchaseOrder(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

}