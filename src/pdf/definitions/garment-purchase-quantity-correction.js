var say = require('../../utils/say');
var global = require('../../global');

module.exports = function (purchaseQuantityCorrection, offset) {

    var items = purchaseQuantityCorrection.items.map((item) => {
        var deliveryOrderItem = purchaseQuantityCorrection.deliveryOrder.items.find((deliveryOrderItem) => deliveryOrderItem.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
        var deliveryOrderFulfillment = deliveryOrderItem.fulfillments.find((deliveryOrderFulfillment) => deliveryOrderFulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && deliveryOrderFulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && deliveryOrderFulfillment.productId.toString() === item.productId.toString());
        return {
            refNo: item.purchaseOrderInternal.refNo,
            artikel: item.purchaseOrderInternal.artikel,
            productCode: item.product.code,
            productName: item.product.name,
            deliveredQuantity: deliveryOrderFulfillment.deliveredQuantity,
            uom: item.uom.unit,
            pricePerUnit: item.pricePerUnit,
            correctionQuantity: item.quantity,
            unitCode: item.purchaseOrderInternal.unit.code
        };
    });

    items = [].concat.apply([], items);
    var iso = "FM-PB-00-06-015/R1";
    var currency = purchaseQuantityCorrection.items.find((item) => true).currency;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var numberLocaleOptions = {
        style: 'decimal',
        maximumFractionDigits: 4

    };

    var header = [
        {
            text: 'PT. DAN LIRIS',
            style: ['size08', 'bold']
        },
        {
            stack: [
                'Head Office   : ',
                'Kelurahan Banaran, Kecamatan Grogol',
                'Sukoharjo 57193 - INDONESIA',
                'PO.BOX 166 Solo 57100',
                'Telp. (0271) 740888, 714400',
                'Fax. (0271) 735222, 740777'
            ],
            style: ['size07', 'bold']
        },
        {
            alignment: "center",
            text: 'NOTA KOREKSI',
            style: ['size09', 'bold']
        },
        '\n'
    ];

    var subHeader = [
        {
            columns: [{
                width: '15%',
                text: 'No. Nota Koreksi',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: purchaseQuantityCorrection.no,
                style: ['size08']
            },
            {
                width: '15%',
                text: 'Tanggal',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: `${moment(purchaseQuantityCorrection.date).add(offset, 'h').format("DD MMM YYYY")}`,
                style: ['size08']
            }]
        },
        {
            columns: [{
                width: '15%',
                text: 'Kode Supplier',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: purchaseQuantityCorrection.deliveryOrder.supplier.code,
                style: ['size08']
            },
            {
                width: '15%',
                text: 'No. Surat Jalan',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: purchaseQuantityCorrection.deliveryOrder.no,
                style: ['size08']
            }]
        },
        {
            columns: [{
                width: '15%',
                text: 'Nama Supplier',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: purchaseQuantityCorrection.deliveryOrder.supplier.name,
                style: ['size08']
            },
            {
                width: '15%',
                text: 'Tanggal Surat Jalan',
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: `${moment(purchaseQuantityCorrection.deliveryOrder.date).add(offset, 'h').format("DD MMM YYYY")}`,
                style: ['size08']
            }]
        }
    ];


    var thead = [
        {
            text: 'Plan PO',
            style: 'tableHeader'
        }, {
            text: 'Artikel',
            style: 'tableHeader'
        }, {
            text: 'Kode Barang',
            style: 'tableHeader'
        }, {
            text: 'Nama Barang',
            style: 'tableHeader'
        }, {
            text: 'Jumlah',
            style: 'tableHeader'
        }, {
            text: 'Satuan',
            style: 'tableHeader'
        }, {
            text: 'Harga Satuan',
            style: 'tableHeader'
        }, {
            text: 'Jumlah Koreksi',
            style: 'tableHeader'
        }, {
            text: 'Harga/Satuan\n(Koreksi)',
            style: 'tableHeader'
        }, {
            text: 'Total Harga',
            style: 'tableHeader'
        }
    ];

    var subTotal = 0;
    var units = [];

    var tbody = items.map((item, index) => {
        var total = (item.correctionQuantity - item.deliveredQuantity) * item.pricePerUnit;
        subTotal += total;

        if (item.unitCode) {
            var po = item.purchaseOrderInternal;
            var unit = units.find((unit) => unit.code === item.unitCode);

            if (!unit) {
                units.push({
                    code: item.unitCode,
                    total: total
                });
            }
            else {
                unit.total = total;
            }
        }

        return [{
            text: item.refNo,
            style: ['size08', 'left']
        }, {
            text: item.artikel,
            style: ['size08', 'left']
        }, {
            text: item.productCode,
            style: ['size08', 'left']
        }, {
            text: item.productName,
            style: ['size08', 'left']
        }, {
            text: item.deliveredQuantity,
            style: ['size08', 'right']
        }, {
            text: item.uom,
            style: ['size08', 'left']
        }, {
            text: item.pricePerUnit.toFixed(4),
            style: ['size08', 'right']
        }, {
            text: item.correctionQuantity - item.deliveredQuantity,
            style: ['size08', 'right']
        }, {
            text: item.pricePerUnit.toFixed(4),
            style: ['size08', 'right']
        }, {
            text: total.toFixed(4),
            style: ['size08', 'right']
        }];

    });

    var poUnits = [];

    var totalHargaPokok = (subTotal * currency.rate).toFixed(4);
    var totalCols = [{
        columns: [{
            width: '15%',
            text: "Total Amount",
            style: ['size08']
        }, {
            width: '2%',
            text: ':',
            style: ['size08']
        }, {
            width: '33%',
            text: subTotal < 0 ? "(" + Math.abs(subTotal).toFixed(4) + ")" : subTotal.toFixed(4),
            style: ['size08']
        }]
    }, {
        columns: [{
            width: '15%',
            text: "Mata Uang",
            style: ['size08']
        }, {
            width: '2%',
            text: ':',
            style: ['size08']
        }, {
            width: '33%',
            text: currency.code,
            style: ['size08']
        }]
    }, {
        columns: [{
            width: '15%',
            text: "Total Harga Pokok (Rp)",
            style: ['size08']
        }, {
            width: '2%',
            text: ':',
            style: ['size08']
        }, {
            width: '33%',
            text: totalHargaPokok < 0 ? "(" + Math.abs(totalHargaPokok).toFixed(4) + ")" : totalHargaPokok,
            style: ['size08']
        }]
    }];

    for (var unit of units) {
        var obj = {
            columns: [{
                width: '15%',
                text: "Total " + unit.code,
                style: ['size08']
            }, {
                width: '2%',
                text: ':',
                style: ['size08']
            }, {
                width: '33%',
                text: unit.total < 0 ? "(" + Math.abs(unit.total).toFixed(4) + ")" : unit.total.toFixed(4),
                style: ['size08']
            },]
        };

        poUnits.push(obj);
    }

    for (var i = 0; i < totalCols.length; i++) {
        if (poUnits[i]) {
            poUnits[i].columns.push(totalCols[i].columns[0]);
            poUnits[i].columns.push(totalCols[i].columns[1]);
            poUnits[i].columns.push(totalCols[i].columns[2]);
        }
        else {
            var obj = {
                columns: [{
                    width: '15%',
                    text: "",
                    style: ['size08']
                }, {
                    width: '2%',
                    text: '',
                    style: ['size08']
                }, {
                    width: '33%',
                    text: "",
                    style: ['size08']
                }, totalCols[i].columns[0], totalCols[i].columns[1], totalCols[i].columns[2]]
            };
            poUnits.push(obj);
        }
    }

    if (poUnits.length)
        poUnits.push(totalCols);


    var table = ['\n', {
        table: {
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var footer = ['\n\n\n', {
        table: {
            widths: ['33%', '34%', '33%'],
            body: [
                [
                    {
                        text: 'Administrasi',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Staff Pembelian',
                        style: ['size08', 'bold', 'center']
                    }, {
                        text: 'Verifikasi',
                        style: ['size08', 'bold', 'center']
                    }
                ],
                [
                    {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size08', 'center']
                            }
                        ]
                    }
                ]
            ],
            style: ['center']
        }
    }];

    var purchaseQuantityCorrectinPdfDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: 10,
        content: [].concat(header, subHeader, table, ['\n'], poUnits, footer),
        styles: {
            size06: {
                fontSize: 6
            },
            size07: {
                fontSize: 7
            },
            size08: {
                fontSize: 8
            },
            size09: {
                fontSize: 9
            },
            size10: {
                fontSize: 10
            },
            bold: {
                bold: true
            },
            center: {
                alignment: 'center'
            },
            left: {
                alignment: 'left'
            },
            right: {
                alignment: 'right'
            },
            justify: {
                alignment: 'justify'
            }
        }
    };


    return purchaseQuantityCorrectinPdfDefinition;
}