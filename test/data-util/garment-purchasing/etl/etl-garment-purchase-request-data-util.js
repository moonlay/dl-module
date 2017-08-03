"use strict";
var ObjectId = require("mongodb").ObjectId;

class garmentPurchaseRequestDataUtil {

    getNewData() {
        var datas = [];

        var data = [{
            Art: "uni-test-art",
            Buyer: "T02",
            Cat: "SPM",
            Delivery: new Date(),
            Harga: 111,
            Ketr: "ketr",
            Kett: "Kett",
            Kett2: "Kett2",
            Kett3: "Kett3",
            Kett4: "Kett4",
            Kett5: "Kett5",
            Kodeb: "SPM",
            Konf: "C2B",
            Nopo: "PA16100606",
            Qty: 1,
            Ro: "unitTest-Ro",
            Satb: "PCS",
            Shipment: new Date(),
            Tgled: new Date(),
            Tglin: new Date(),
            TgValid: new Date(),
            Usered: "uni-test",
            Userin: "uni-test",
        }, {
                Art: "uni-test-art",
                // Buyer: "testBuyer",
                Buyer: "buyerNotFound",
                Cat: "CatNotFound",
                // Cat: "SPM2",
                Delivery: new Date(),
                Harga: 111,
                Ketr: "ketr",
                Kett: "Kett",
                Kett2: "Kett2",
                Kett3: "Kett3",
                Kett4: "Kett4",
                Kett5: "Kett5",
                Kodeb: "ProductNotFound",
                // Kodeb: "testProduct",
                // Konf: "testUnit",
                Konf: "unitNotFound",
                Nopo: "22222222222",
                Qty: 1,
                Ro: "unitTest-Ro2",
                Satb: "uomNotFound",
                // Satb: "PCS2",
                Shipment: new Date(),
                Tgled: new Date(),
                Tglin: new Date(),
                TgValid: new Date(),
                Usered: "uni-test",
                Userin: "uni-test",
            }, {
                Art: "uni-test-art",
                Buyer: "testBuyer",
                // Buyer: "buyerNotFound",
                // Cat: "CatNotFound",
                Cat: "SPM2",
                Delivery: new Date(),
                Harga: 111,
                Ketr: "ketr",
                Kett: "Kett",
                Kett2: "Kett2",
                Kett3: "Kett3",
                Kett4: "Kett4",
                Kett5: "Kett5",
                Kodeb: "ProductNotFound",
                // Kodeb: "testProduct",
                Konf: "testUnit",
                // Konf: "unitNotFound",
                Nopo: "33333333333",
                Qty: 1,
                Ro: "unitTest-Ro3",
                Satb: "uomNotFound",
                // Satb: "PCS2",
                Shipment: new Date(),
                Tgled: new Date(),
                Tglin: new Date(),
                TgValid: new Date(),
                Usered: "uni-test",
                Userin: "uni-test",
            }];

        // datas.push(data);

        // return Promise.resolve(datas);
        return Promise.resolve(data);
    }

    getData() {

        // Promise.all([this.getNewData()]).then((results) => {
        // var result = results[0];

        var buyerId = new ObjectId();
        var uomId = new ObjectId();
        var catId = new ObjectId();
        var productId = new ObjectId();
        var unitId = new ObjectId();

        var data = {
            Buyer: [{
                _id: buyerId,
                code: "T02",
                name: "test",
                address: "test",
                city: "test",
                country: "test",
                contact: "test",
                tempo: "test",
                type: "test",
                NPWP: "test"
            }, {
                    _id: new ObjectId(),
                    code: "testBuyer",
                    name: "test",
                    address: "test",
                    city: "test",
                    country: "test",
                    contact: "test",
                    tempo: "test",
                    type: "test",
                    NPWP: "test"
                }],

            Category: [{
                _id: catId,
                code: "SPM",
                name: "test"
            }, {
                    _id: new ObjectId(),
                    code: "SPM2",
                    name: "test"
                }],

            Product: [{

                _id: productId,
                code: "SPM",
                name: "test",
                price: 0,
                currency: {
                    _stamp: "",
                    _type: "currency",
                    _version: "1.0.0",
                    _active: false,
                    _deleted: false,
                    _createdBy: "",
                    _createdDate: new Date(),
                    _createAgent: "",
                    _updatedBy: "",
                    _updatedDate: new Date(),
                    _updateAgent: "",
                    code: "",
                    symbol: "",
                    rate: 1,
                    description: ""
                },
                description: "uni test",
                uomId: uomId,
                uom: {
                    _id: uomId,
                    _stamp: "8d430992b300780",
                    _type: "uom",
                    _version: "1.0.0",
                    _active: true,
                    _deleted: false,
                    _createdBy: "router",
                    _createdDate: new Date(),
                    _createAgent: "manager",
                    _updatedBy: "router",
                    _updatedDate: new Date(),
                    _updateAgent: "manager",
                    unit: "PCS"
                },
                tags: "",
                properties: [
                    "",
                    "",
                    ""
                ]
            }, {

                    _id: new Object(),
                    code: "testProduct",
                    name: "test",
                    price: 0,
                    currency: {
                        _stamp: "",
                        _type: "currency",
                        _version: "1.0.0",
                        _active: false,
                        _deleted: false,
                        _createdBy: "",
                        _createdDate: new Date(),
                        _createAgent: "",
                        _updatedBy: "",
                        _updatedDate: new Date(),
                        _updateAgent: "",
                        code: "",
                        symbol: "",
                        rate: 1,
                        description: ""
                    },
                    description: "uni test",
                    uomId: uomId,
                    uom: {
                        _id: uomId,
                        _stamp: "8d430992b300780",
                        _type: "uom",
                        _version: "1.0.0",
                        _active: true,
                        _deleted: false,
                        _createdBy: "router",
                        _createdDate: new Date(),
                        _createAgent: "manager",
                        _updatedBy: "router",
                        _updatedDate: new Date(),
                        _updateAgent: "manager",
                        unit: "PCS"
                    },
                    tags: "",
                    properties: [
                        "",
                        "",
                        ""
                    ]
                }],
            Unit: [{
                _id: unitId,
                code: "C2B",
                name: "test",
                description: "",
                divisionId: ObjectId("586630e9f28e81002db4b28b"),
                division: {
                    _id: ObjectId("586630e9f28e81002db4b28b"),
                    _stamp: "8d4309b15d09d80",
                    _type: "division",
                    _version: "1.0.0",
                    _active: true,
                    _deleted: false,
                    _createdBy: "router",
                    _createdDate: new Date(),
                    _createAgent: "manager",
                    _updatedBy: "router",
                    _updatedDate: new Date(),
                    _updateAgent: "manager",
                    code: "test",
                    name: "test",
                    description: ""
                }
            }, {
                    _id: new ObjectId(),
                    code: "testUnit",
                    name: "test",
                    description: "",
                    divisionId: ObjectId("586630e9f28e81002db4b28b"),
                    division: {
                        _id: ObjectId("586630e9f28e81002db4b28b"),
                        _stamp: "8d4309b15d09d80",
                        _type: "division",
                        _version: "1.0.0",
                        _active: true,
                        _deleted: false,
                        _createdBy: "router",
                        _createdDate: new Date(),
                        _createAgent: "manager",
                        _updatedBy: "router",
                        _updatedDate: new Date(),
                        _updateAgent: "manager",
                        code: "test",
                        name: "test",
                        description: ""
                    }
                }],
            Uom: [{
                _id: uomId,
                unit: "PCS"
            }, {
                    _id: new ObjectId(),
                    unit: "PCS2"
                }],
        }

        return Promise.resolve(data);
    }

}
module.exports = new garmentPurchaseRequestDataUtil();