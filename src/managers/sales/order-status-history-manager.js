"use strict";

const ObjectId = require("mongodb").ObjectId;
const DLModels = require('dl-models');
const map = DLModels.map;
const OrderStatusHistory = DLModels.sales.OrderStatusHistory;

module.exports = class OrderStatusHistoryManager {
    constructor(db, user) {
        this.user = user;
        this.collection = db.use(map.sales.collection.OrderStatusHistory);
    }

    _pre(data) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._beforeInsert(data);
            });
    }

    _beforeInsert(data) {
        let now = new Date();

        data = data.map(d => {
            if (!d.stamp) {
                d = new OrderStatusHistory(d);

            }

            d._createdDate = now;
            d.stamp(this.user.username, "manager");

            return d;
        });

        return Promise.resolve(data);
    }

    read(productionOrders) {
        let query = {
            "$match": {
                _deleted: false,
                productionOrderNo: { "$in": productionOrders }
            }
        };

        let group = {
            "$group": {
                "_id": "$productionOrderNo",
                "deliveryDateCorrection": { "$first": "$deliveryDateCorrection" },
                "reason": { "$first": "$reason" }
            }
        };

        let select = {
            "$project": {
                productionOrderNo: 1,
                deliveryDateCorrection: 1,
                reason: 1,
                _updatedDate: 1
            }
        };

        let sort = {
            "$sort": { "_updatedDate": -1 }
        };

        return this.collection.aggregate([
            sort,
            query,
            select,
            group
        ]).toArray();
    }

    getByProductionOrderNo(productionOrderNo) {
        let query = {
            productionOrderNo: productionOrderNo,
            _deleted: false
        };

        let select = {
            _createdDate: 1,
            deliveryDateCorrection: 1,
            reason: 1
        };

        let order = {
            _updatedDate: -1
        };

        return this.collection.find(query, select).sort(order).toArray();
    }

    create(data) {
        return this._pre(data)
            .then((processedData) => {
                return this.collection.insertMany(processedData);
            });
    }

    _createIndexes() {
        let dateIndex = {
            name: `ix_${map.sales.collection.OrderStatusHistory}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        let deletedIndex = {
            name: `ix_${map.sales.collection.OrderStatusHistory}__deleted`,
            key: {
                _deleted: 1
            }
        };

        let productionOrderNoIndex = {
            name: `ix_${map.sales.collection.OrderStatusHistory}_productionOrderNo`,
            key: {
                productionOrderNo: 1
            }
        }

        return this.collection.createIndexes([dateIndex, deletedIndex, productionOrderNoIndex]);
    }
}