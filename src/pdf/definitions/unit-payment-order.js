var say = require('../../utils/say');
var global = require('../../global');

module.exports = function (unitPaymentOrder, offset) {

    var items = unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return unitPaymentOrderItem.unitReceiptNote.items.map(receiptNoteItem => {
            return {
                product: receiptNoteItem.product.name,
                prNo: receiptNoteItem.purchaseOrder.purchaseRequest.no,
                unitReceiptNoteNo: unitPaymentOrderItem.unitReceiptNote.no,
                quantity: receiptNoteItem.deliveredQuantity,
                uom: receiptNoteItem.deliveredUom.unit,
                price: receiptNoteItem.pricePerDealUnit,
                duedays: receiptNoteItem.purchaseOrder.purchaseOrderExternal.paymentDueDays,
            };
        });
    });

    items = [].concat.apply([], items);

    var receiptNoteDates = unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return new Date(unitPaymentOrderItem.unitReceiptNote.date)
    })
    var maxReceiptNoteDate = Math.max.apply(null, receiptNoteDates);

    var test = items.map(function (item, index) {
    dueDate = new Date(maxReceiptNoteDate);
    dueDate.setDate(dueDate.getDate() + item.duedays)
    })

    var iso = "FM-PB-00-06-014/R1";
    var number = unitPaymentOrder.no;
    var currency = unitPaymentOrder.currency.code;
    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var initialValue = {
        price: 0,
        quntity: 0
    };

    var sum = (items.length > 0 ? items : [initialValue])
        .map(item => item.price * item.quantity)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var incomeTax = unitPaymentOrder.useIncomeTax ? sum * 0.1 : 0;
    var vat = unitPaymentOrder.useVat ? sum * (unitPaymentOrder.vatRate / 100) : 0;

    var header = [{
        columns: [
            {
                width: '40%',
                stack: [{
                    text: 'PT DAN LIRIS',
                    style: ['size20', 'bold']
                }, {
                        text: 'BANARAN, GROGOL, SUKOHARJO',
                        style: ['size08']
                    }]
            }, {
                width: '30%',
                columns: [{
                    width: '50%',
                    stack: [{
                        text: 'NOTA KREDIT',
                        style: ['size20', 'bold']
                    }, {
                            text: unitPaymentOrder.paymentMethod === 'KREDIT' ? '' : unitPaymentOrder.paymentMethod,
                            style: ['size08', 'center']
                        }]
                }]
            }, {
                width: '40%',
                columns: [{
                    width: '60%',
                    stack: [{
                        alignment: "left",
                        text: iso,
                        style: ['size08']
                    }, {
                            alignment: "left",
                            text: 'SUKOHARJO, ' + `${moment(unitPaymentOrder.date).add(offset,'h').format(locale.date.format)}`,
                            style: ['size08']
                        }, {
                            alignment: "left",
                            text: '( ' + unitPaymentOrder.supplier.code + ' )  ' + unitPaymentOrder.supplier.name,
                            style: ['size08']
                        }, {
                            alignment: "left",
                            text: unitPaymentOrder.supplier.address,
                            style: ['size08']
                        }
                    ]
                }]
            }
        ]
    }, '\n']

    var subHeader = [{
        columns: [
            {
                width: '60%',
                stack: [{
                    columns: [{
                        width: '25%',
                        text: "Nota Pembelian"
                    }, {
                            width: '5%',
                            text: ":"
                        }, {
                            width: '*',
                            text: unitPaymentOrder.category.name
                        }],
                    style: ['size08']
                }, {
                        columns: [{
                            width: '25%',
                            text: "Untuk"
                        }, {
                                width: '5%',
                                text: ":"
                            }, {
                                width: '*',
                                text: unitPaymentOrder.division.name
                            }],
                        style: ['size08']
                    }
                ]
            },
            {
                width: '10%',
                text: ''
            },
            {
                width: '40%',
                columns: [{
                    width: '10%',
                    text: 'Nomor '
                }, {
                        width: '5%',
                        text: ': '
                    }, {
                        width: '*',
                        text: number
                    }],
                style: ['size08']
            }
        ]
    }, '\n'];

    var line = [{
        canvas: [{
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 378,
            y2: 5,
            lineWidth: 0.5
        }
        ]
    }, '\n'];

    var thead = [
        {
            text: 'No.',
            style: 'tableHeader'
        }, {
            text: 'Nama Barang',
            style: 'tableHeader'
        }, {
            text: 'Jumlah',
            style: 'tableHeader'
        }, {
            text: 'Harga Satuan',
            style: 'tableHeader'
        }, {
            text: 'Harga Total',
            style: 'tableHeader'
        },
        {
            text: 'Nomor Order',
            style: 'tableHeader'
        },
        {
            text: 'Nomor Bon Unit',
            style: 'tableHeader'
        },
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size08', 'center']
        }, {
                text: item.product,
                style: ['size08', 'left']
            }, {
                text: item.quantity + ' ' + item.uom,
                style: ['size08', 'right']
            }, {
                columns: [{
                    width: '20%',
                    text: `${currency}`
                }, {
                        width: '*',
                        text: item.price.toLocaleString(locale, locale.currencyNotaItern2),
                        style: ['right']
                    }],
                style: ['size08']
            }, {
                columns: [{
                    width: '20%',
                    text: `${currency}`
                }, {
                        width: '*',
                        text: parseFloat(item.price * item.quantity).toLocaleString(locale, locale.currencyNotaItern),
                        style: ['right']
                    }],
                style: ['size08']
            }, {
                text: item.prNo,
                style: ['size08', 'center']
            }, {
                text: item.unitReceiptNoteNo,
                style: ['size08', 'center']
            }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 7
        }, "", "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ['4%', '25%', '10%', '17%', '20%', '12%', '12%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var closing = ['\n',
        {
            columns: [
                {
                    width: '40%',
                    stack: ['\n',
                        {
                            columns: [{
                                width: '50%',
                                text: unitPaymentOrder.useVat ? `PPh ${unitPaymentOrder.vat.name} ${unitPaymentOrder.vatRate} %` : ""
                            },
                                {
                                    width: '5%',
                                    text: unitPaymentOrder.useVat ? ":" : ""
                                },
                                {
                                    width: '10%',
                                    text: unitPaymentOrder.useVat ? currency : ""
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.useVat ? parseFloat(Math.round(vat * 100) / 100).toLocaleString(locale, locale.currencyNotaItern) : "",
                                    style: 'right'
                                }]
                        }, {
                            columns: [{
                                width: '50%',
                                text: unitPaymentOrder.useVat ? "Jumlah dibayar Ke Supplier" : ""
                            },
                                {
                                    width: '5%',
                                    text: unitPaymentOrder.useVat ? ":" : ""
                                },
                                {
                                    width: '10%',
                                    text: unitPaymentOrder.useVat ? currency : ""
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.useVat ?parseFloat(Math.round(((sum + incomeTax) - vat) * 100) / 100).toLocaleString(locale, locale.currencyNotaItern) : "",
                                    style: 'right'
                                }]
                        }]
                },
                {
                    width: '20%',
                    text: ''
                },
                {
                    width: '40%',
                    stack: [
                        {
                            columns: [{
                                width: '45%',
                                text: "Jumlah . . . . . . . . . . . . . . ."
                            },
                                {
                                    width: '10%',
                                    text: currency
                                },
                                {
                                    width: '*',
                                    text: parseFloat(Math.round(sum * 100) / 100).toLocaleString(locale, locale.currencyNotaItern),
                                    style: 'right'
                                }]
                        }, {
                            columns: [{
                                width: '45%',
                                text: "PPn 10 %. . . . . . . . . . . . . ."
                            },
                                {
                                    width: '10%',
                                    text: unitPaymentOrder.useIncomeTax ? currency : '-'
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.useIncomeTax ? parseFloat(Math.round(incomeTax * 100) / 100).toLocaleString(locale, locale.currencyNotaItern) : '',
                                    style: 'right'
                                }]
                        }, {
                            columns: [{
                                width: '45%',
                                text: "T O T A L. . . . . . . . . . . . . ."
                            },
                                {
                                    width: '10%',
                                    text: currency
                                },
                                {
                                    width: '*',
                                    text: parseFloat(Math.round((sum + incomeTax) * 100) / 100).toLocaleString(locale, locale.currencyNotaItern),
                                    style: 'right'
                                }]
                        }]
                }
            ],
            style: ['size08']
        }, '\n',
        {
            width: '25%',
            text: `Terbilang : ${say((sum + incomeTax) - vat,unitPaymentOrder.currency.description)}`,
            style: ['size09', 'bold']
        }, '\n',
        {
            columns: [
                {
                    width: '50%',
                    stack: [
                        {
                            columns: [{
                                width: '40%',
                                text: "Perjanjian Pembayaran"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: moment(dueDate ||unitPaymentOrder.dueDate ).add(offset,'h').format(locale.date.format)
                                }]
                        }, {
                            columns: [{
                                width: '40%',
                                text: "Invoice"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.invoceNo + ', ' + moment(unitPaymentOrder.invoceDate).add(offset,'h').format(locale.date.format) || '-'
                                }]
                        },
                        {
                            columns: [{
                                width: '40%',
                                text: "No PIB"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                     text: unitPaymentOrder.pibNo || '-'
                                }]
                        }, 
                        {
                            columns: [{
                                width: '40%',
                                text: "Ket."
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.remark || '-'
                                }]
                        }]
                },
                {
                    width: '10%',
                    text: ''
                },
                {
                    width: '40%',
                    stack: [
                        {
                            columns: [{
                                width: '45%',
                                text: "Barang Datang"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: moment(maxReceiptNoteDate).add(offset,'h').format(locale.date.format)
                                }]
                        }, {
                            columns: [{
                                width: '45%',
                                text: "Nomor Faktur Pajak PPN"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.incomeTaxNo || '-'
                                }]
                        }, {
                            columns: [{
                                width: '45%',
                                text: "Pembayaran"
                            },
                                {
                                    width: '5%',
                                    text: ":"
                                },
                                {
                                    width: '*',
                                    text: unitPaymentOrder.paymentMethod || ''
                                }]
                        }]
                }
            ],
            style: ['size08']
        }
    ];

    var footer = ['\n', {
        columns: [{
            width: '25%',
            stack: ['Diperiksa,', 'Verifikasi', '\n\n\n\n', '(                               )'],
            style: ['center']
        }, {
                width: '25%',
                stack: ['Mengetahui,', 'Pimpinan Bagian', '\n\n\n\n', '(                               )'],
                style: ['center']
            }, {
                width: '25%',
                stack: ['Tanda Terima,', 'Bagian Pembelian', '\n\n\n\n', '(                               )'],
                style: ['center']
            }, {
                width: '25%',
                stack: ['Dibuat Oleh,', ' ', '\n\n\n\n', `(  ${unitPaymentOrder._createdBy}  )`],
                style: ['center']
            }],
        style: ['size08']
    }];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'landscape',
        pageMargins: 20,
        content: [].concat(header, subHeader, table, closing, footer),
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
            size15: {
                fontSize: 15
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
            },
            tableHeader: {
                bold: true,
                fontSize: 8,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return dd;
}