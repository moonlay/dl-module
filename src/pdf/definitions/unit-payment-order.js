var say = require('../../utils/say');
var global = require('../../global');

module.exports = function (unitPaymentOrder) {

    var items = unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return unitPaymentOrderItem.unitReceiptNote.items.map(receiptNoteItem => {
            return {
                product: receiptNoteItem.product.name,
                prNo: receiptNoteItem.purchaseOrder.purchaseRequest.no,
                unitReceiptNoteNo: unitPaymentOrderItem.unitReceiptNote.no,
                quantity: receiptNoteItem.deliveredQuantity,
                uom: receiptNoteItem.deliveredUom.unit,
                price: receiptNoteItem.pricePerDealUnit
            };
        });
    });

    items = [].concat.apply([], items);

    var receiptNoteDates = unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return new Date(unitPaymentOrderItem.unitReceiptNote.date)
    })
    var maxReceiptNoteDate = Math.max.apply(null, receiptNoteDates);

    var iso = "FM-6.00-06-012/R2";
    var number = unitPaymentOrder.no;

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

    var incomeTax = unitPaymentOrder.incomeTaxNo != '' ? sum * 0.1 : 0;
    var vat = unitPaymentOrder.vatNo != '' ? sum * (unitPaymentOrder.vatRate / 100) : 0;

    var header = [{
        columns: [
            {
                width: '70%',
                columns: [{
                    width: '60%',
                    stack: [{
                        text: '"DAN LIRIS"',
                        style: ['size20', 'bold']
                    }, {
                        text: 'INDUSTRIAL & TRADING CO.LTD.',
                        style: ['size08']
                    }, {
                        text: 'Kel. Banaran Kec. Grogol Kab. Sukoharjo',
                        style: ['size08']
                    },
                    {
                        text: 'Telp. (0271) 714400',
                        style: ['size08']
                    }]
                }, {
                    width: '28%',
                    stack: ['NOTA KREDIT']
                },],
                style: ['size20', "bold"]

            },
            {
                width: '60%',
                columns: [{
                    width: '60%',
                    stack: [{
                        alignment: "left",
                        text: iso,
                        style: ['size08']
                    }, {
                        alignment: "left",
                        text: 'SUKOHARJO, ' + `${moment(unitPaymentOrder.date).format(locale.date.format)}`,
                        style: ['size09']
                    }, {
                        alignment: "left",
                        text: '( ' + unitPaymentOrder.supplier.code + ' )  ' + unitPaymentOrder.supplier.name,
                        style: ['size09']
                    }, {
                        alignment: "left",
                        text: unitPaymentOrder.supplier.address,
                        style: ['size09']
                    }
                    ]
                }],
                style: ['size08']
            }
        ]
    }, '\n']

    var subHeader = [{
        columns: [
            {
                width: '100%',
                columns: [{
                    width: '70%',
                    stack: [{
                        text: 'Nota Pembelian ' + unitPaymentOrder.category.name + '      No. ' + number,
                        style: ['size08', "underline"]
                    },
                    {
                        text: '' + unitPaymentOrder.unit.division + ' ' + unitPaymentOrder.unit.subDivision,
                        style: ['size08']
                    }]

                }],
                style: ['size09']
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
        }
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size07', 'center']
        }, {
            text: item.product,
            style: ['size07', 'left']
        }, {
            text: item.quantity + ' ' + item.uom,
            style: ['size07', 'right']
        }, {
            text: parseFloat(item.price).toLocaleString(locale, locale.currencyNotaItern),
            style: ['size07', 'right']
        }, {
            text: parseFloat(item.price * item.quantity).toLocaleString(locale, locale.decimal),
            style: ['size07', 'right']
        }, {
            text: item.prNo,
            style: ['size07', 'center']
        }, {
            text: item.unitReceiptNoteNo,
            style: ['size07', 'center']
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
            widths: ['5%', '25%', '15%', '10%', '15%', '15%', '15%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var closing = [
        '\n', {
            stack: [{
                columns: [{
                    width: '30%',
                    stack: [''],
                    style: 'center'
                }, {
                    width: '20%',
                    stack: [''],
                    style: 'center'
                }, {
                    width: '25%',
                    stack: ['Jumlah . . . . . . . . . . . . . . RP'],
                    style: 'left'
                },
                {
                    width: '25%',
                    stack: [parseFloat(sum).toLocaleString(locale, locale.decimal)],
                    style: 'right'
                }]
            },
            {
                columns: [{
                    width: '30%',
                    stack: ['PPh ' + unitPaymentOrder.vat.name + ' ' + unitPaymentOrder.vatRate + ' %'],
                    style: 'left'
                }, {
                    width: '20%',
                    stack: ['RP     ' + parseFloat(vat).toLocaleString(locale, locale.currencyNotaItern)],
                    style: 'left'
                }, {
                    width: '25%',
                    stack: ['PPn 10 %. . . . . . . . . . . . . RP '],
                    style: 'left'
                },
                {
                    width: '25%',
                    stack: [parseFloat(incomeTax).toLocaleString(locale, locale.currencyNotaItern)],
                    style: 'right'
                }]
            },
            {
                columns: [{
                    width: '30%',
                    stack: ['Jumlah dibayar Ke Supplier '],
                    style: 'left'
                }, {
                    width: '20%',
                    stack: ['RP     ' + parseFloat((sum + incomeTax) - vat).toLocaleString(locale, locale.currencyNotaItern)],
                    style: 'left'
                }, {
                    width: '25%',
                    stack: ['T O T A L. . . . . . . . . . . . . . RP'],
                    style: 'left'
                },
                {
                    width: '25%',
                    stack: [parseFloat(sum + incomeTax).toLocaleString(locale, locale.currencyNotaItern)],
                    style: 'right'
                }]
            },
            {
                columns: [{
                    width: '25%',
                    stack: ['\nTerbilang :'],
                    style: 'left'
                }, {
                    width: '75%',
                    stack: ['\n' + say((sum + incomeTax) - vat)],
                    style: 'left'
                }]
            },
            {
                columns: [{
                    width: '25%',
                    stack: ['\nPerjanjian Pembayaran :'],
                    style: 'left'
                }, {
                    width: '75%',
                    stack: ['\n' + `${moment(unitPaymentOrder.dueDate).format(locale.date.format)}`],
                    style: 'left'
                }]
            },
            {
                columns: [{
                    width: '25%',
                    stack: ['Nota :'],
                    style: 'left'
                }, {
                    width: '25%',
                    stack: ['' + unitPaymentOrder.invoceNo],
                    style: 'left'
                }, {
                    width: '25%',
                    stack: ['Barang Datang :'],
                    style: 'left'
                }, {
                    width: '75%',
                    stack: [`${moment(maxReceiptNoteDate).format(locale.date.format)}`],
                    style: 'left'
                }]
            },
            {
                columns: [{
                    width: '25%',
                    stack: ['Ket :'],
                    style: 'left'
                }, {
                    width: '75%',
                    stack: [unitPaymentOrder.remark || ''],
                    style: 'left'
                },
                {
                    width: '25%',
                    stack: ['Nomor Faktur Pajak PPN:'],
                    style: 'left'
                }, {
                    width: '75%',
                    stack: [unitPaymentOrder.incomeTaxCorrectionNo || ''],
                    style: 'left'
                }]
            }
            ],
            style: ['size08']
        }
    ];

    var footer = [
        '\n', {
            stack: [{
                columns: [{
                    width: '25%',
                    stack: ['Diperiksa,\nVerifikasi\n\n\n\n', '(_______________________)'],
                    style: 'center'
                }, {
                    width: '25%',
                    stack: ['Mengetahui,\nPimpinan Bagian\n\n\n\n', '(_______________________)'],
                    style: 'center'
                }, {
                    width: '25%',
                    stack: ['Tanda Terima,\nBagian Pembelian\n\n\n\n', '(_______________________)'],
                    style: 'center'
                },
                {
                    width: '25%',
                    stack: ['Dibuat Oleh,\n\n\n\n\n', '(_______' + unitPaymentOrder._createdBy + '_______)'],
                    style: 'center'
                }]
            }
            ],
            style: ['size08']
        }
    ];

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