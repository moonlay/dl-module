var global = require('../../global');

module.exports = function (data, offset) {
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

    var locale = global.config.locale;
    var moment = require('moment');
    moment.locale(locale.name);

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
                text: data.no,
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
                text: `${moment(data.date).add(offset, 'h').format("DD MMM YYYY")}`,
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
                text: data.deliveryOrder.supplier.code,
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
                text: data.deliveryOrder.no,
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
                text: data.deliveryOrder.supplier.name,
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
                text: `${moment(data.deliveryOrder.supplierDoDate).add(offset, 'h').format("DD MMM YYYY")}`,
                style: ['size08']
            }]
        }
    ];

    var thead = [{
        text: 'Plan PO',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Artikel',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Kode Barang',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Nama Barang',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Jumlah SJ',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Satuan',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Harga Satuan',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Jumlah Koreksi',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Harga/Satuan (Koreksi)',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'Total Harga',
        style: ['size08', 'bold', 'center']
    }];

    var units = [];
    var totalAmount = 0;

    var tbody = data.items.map(function (item, index) {
        var doItem = data.deliveryOrder.items.find(i => i.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
        var fulfillment = doItem.fulfillments.find(fulfillment => fulfillment.purchaseOrderId.toString() === item.purchaseOrderInternalId.toString() && fulfillment.purchaseRequestId.toString() === item.purchaseRequestId.toString() && fulfillment.productId.toString() === item.productId.toString());

        fulfillment.corrections = fulfillment.corrections || [];

        var pricePerUnit = 0,
            priceTotal = 0;
        
        if(fulfillment.corrections.length > 0) {
            pricePerUnit = item.pricePerUnit - fulfillment.corrections[fulfillment.corrections.length - 1].correctionPricePerUnit;
            priceTotal = item.priceTotal - fulfillment.corrections[fulfillment.corrections.length - 1].correctionPriceTotal;
        }
        else {
            pricePerUnit = item.pricePerUnit - fulfillment.pricePerDealUnit;
            priceTotal = item.priceTotal - (fulfillment.pricePerDealUnit * fulfillment.quantity);
        }

        if(data.correctionType === "Harga Total") {
            pricePerUnit = "-";
        }

        if(item.purchaseOrderInternal) {
            var po = item.purchaseOrderInternal;
            var unit = units.find(u => u.code === po.unit.code);

            if(!unit) {
                units.push({
                    code: po.unit.code,
                    total: data.correctionType != "Harga Total" ? (pricePerUnit * item.quantity) : priceTotal
                });
            }
            else {
                unit.total = unit.total + (data.correctionType != "Harga Total" ? (pricePerUnit * item.quantity) : priceTotal);
            }
        }

        totalAmount = totalAmount + (data.correctionType != "Harga Total" ? (pricePerUnit * item.quantity) : priceTotal);

        item.purchaseOrderInternal = item.purchaseOrderInternal || {};

        return [{
            text: item.purchaseOrderInternal.refNo,
            style: ['size08', 'left']
        }, {
            text: item.purchaseOrderInternal.artikel,
            style: ['size08', 'left']
        }, {
            text: item.product.code,
            style: ['size08', 'left']
        }, {
            text: item.product.name,
            style: ['size08', 'left']
        }, {
            text: fulfillment.deliveredQuantity,
            style: ['size08', 'right']
        }, {
            text: item.uom.unit,
            style: ['size08', 'left']
        }, {
            text: fulfillment.pricePerDealUnit.toFixed(4),
            style: ['size08', 'right']
        }, {
            text: item.quantity,
            style: ['size08', 'right']
        }, {
            text: pricePerUnit === "-" ? pricePerUnit : pricePerUnit.toFixed(4),
            style: ['size08', 'right']
        }, {
            text: data.correctionType != "Harga Total" ? (pricePerUnit * item.quantity).toFixed(4) : priceTotal.toFixed(4),
            style: ['size08', 'right']
        }];
    });

    var poUnits = [];

    var totalHargaPokok = (totalAmount * data.deliveryOrder.items[0].fulfillments[0].currency.rate).toFixed(4);
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
            text: totalAmount  < 0 ? "(" + Math.abs(totalAmount).toFixed(4) + ")" : totalAmount.toFixed(4),
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
            text: data.deliveryOrder.items[0].fulfillments[0].currency.code,
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

    for(var unit of units) {
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

    for(var i = 0; i < totalCols.length; i++) {
        if(poUnits[i]) {
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
    
    if(poUnits.length)
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

    var purchasePriceCorrectionPDFDefinition = {
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

    return purchasePriceCorrectionPDFDefinition;
}