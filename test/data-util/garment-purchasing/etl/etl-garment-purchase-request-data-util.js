"use strict";

class garmentPurchaseRequestDataUtil {

    getNewData() {
        var datas = [];

        var data = {
            Art: "EB/CLB/TAG",
            Buyer: "E05",
            Cat: "CLB",
            Delivery: new Date(),
            Harga: 467,
            Ketr: "PR6700",
            Kett: "Kett",
            Kett2: "Kett2",
            Kett3: "Kett3",
            Kett4: "Kett4",
            Kett5: "Kett5",
            Kodeb: "CLB",
            Konf: "K.1",
            Nopo: "PA16100606",
            Qty: 1790,
            Ro: "unitTest",
            Satb: "PCS",
            Shipment: new Date(),
            Tgled: new Date(),
            Tglin: new Date(),
            TgValid: new Date(),
            Usered: "DARMAYADI",
            Userin: "TITIK PUJI RAHAYU",
        }

        datas.push(data);

        return Promise.resolve(datas);
    }

}
module.exports = new garmentPurchaseRequestDataUtil();