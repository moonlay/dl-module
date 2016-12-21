var Say = require('../../utils/say');
var global = require('../../global');

module.exports = function (unitPaymentCorrection) {

    var items = unitPaymentCorrection.items.map((item) => {
        return {
            quantity: item.quantity,
            uom: item.uom,
            product: item.product,
            pricePerUnit: item.pricePerUnit,
            priceTotal: item.priceTotal,
            prNo: item.purchaseOrder.purchaseRequest.no
        };
    });

    items = [].concat.apply([], items);

    var currency = unitPaymentCorrection.items.find(r => true).currency.code;
    var urDates = unitPaymentCorrection.unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return new Date(unitPaymentOrderItem.unitReceiptNote.date)
    })
    var sjDate = Math.max.apply(null, urDates);

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var numberLocaleOptions = {
        style: 'decimal',
        maximumFractionDigits: 4

    };
    var header = [
        {
            columns: [
                {
                    width: '40%',
                    text: 'PT DAN LIRIS',
                    style: ['size15', 'bold', 'left']
                }, {
                    width: '60%',
                    text: 'NOTA DEBET',
                    style: ['size15', 'bold', 'left']

                }]
        }, {
            columns: [
                {
                    width: '70%',
                    text: 'BANARAN, GROGOL, SUKOHARJO',
                    style: ['size08']
                }, {
                    width: '30%',
                    stack: [
                        `SUKOHARJO, ${moment(unitPaymentCorrection.unitPaymentOrder.date).format(locale.date.format)}`,
                        `(${unitPaymentCorrection.unitPaymentOrder.supplier.code}) ${unitPaymentCorrection.unitPaymentOrder.supplier.name}`,
                        `${unitPaymentCorrection.unitPaymentOrder.supplier.address}`],
                    alignment: 'left',
                    style: ['size08']

                }]
        }, '\n', {
            columns: [
                {
                    stack: [{
                        columns: [{
                            width: '35%',
                            text: "Retur/Potongan"
                        }, {
                                width: '5%',
                                text: ":"
                            }, {
                                width: '*',
                                text: unitPaymentCorrection.unitPaymentOrder.category.name
                            }],
                        style: ['size08']
                    }, {
                            columns: [{
                                width: '35%',
                                text: "Untuk"
                            }, {
                                    width: '5%',
                                    text: ":"
                                }, {
                                    width: '*',
                                    text: unitPaymentCorrection.unitPaymentOrder.division.name
                                }],
                            style: ['size08']
                        }
                    ]
                }, {
                    width: '20%',
                    text: ''
                }, {
                    width: '30%',
                    text: `Nomor ${unitPaymentCorrection.no}`,
                    style: ['size09', 'left', 'bold']
                }]
        }, '\n'
    ];

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
        }, {
            text: 'Nomor Order',
            style: 'tableHeader'
        }
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size07', 'center']
        }, {
                text: item.product.name,
                style: ['size07', 'left']
            }, {
                text: `${item.quantity} ${item.uom.unit}`,
                style: ['size07', 'right']
            }, {
                columns: [{
                    width: '5%',
                    text: currency,
                    style: ['size08']
                }, {
                        width: '*',
                        text: parseFloat(item.pricePerUnit).toLocaleString(locale, locale.currency),
                        style: ['size07', 'right']
                    }]
            }, {
                columns: [{
                    width: '5%',
                    text: currency,
                    style: ['size08']
                }, {
                        width: '*',
                        text: parseFloat(item.priceTotal).toLocaleString(locale, locale.currency),
                        style: ['size07', 'right']
                    }]
            }, {
                text: item.prNo,
                style: ['size07', 'left']
            }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 6
        }, "", "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ['5%', '35%', '15%', '15%', '15%', '15%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];


    var initialValue = {
        priceTotal: 0
    };

    var sum = (items.length > 0 ? items : [initialValue])
        .map(item => item.priceTotal)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var useIncomeTax = unitPaymentCorrection.unitPaymentOrder.incomeTaxNo.length > 0 ? sum * 0.1 : 0;

    var total = ['\n',
        {
            columns: [{
                width: '30%',
                text: 'Jumlah',
                style: ['size08']
            }, {
                    width: '5%',
                    text: currency,
                    style: ['size08']
                }, {
                    width: '65%',
                    text: parseFloat(sum).toLocaleString(locale, locale.currency),
                    style: ['size08', 'right']
                }],
            margin: [350, 0, 0, 0]
        }, {
            columns: [{
                width: '30%',
                text: 'PPN',
                style: ['size08']
            }, {
                    width: '5%',
                    text: currency,
                    style: ['size08']
                }, {
                    width: '65%',
                    text: parseFloat(useIncomeTax).toLocaleString(locale, locale.currency),
                    style: ['size08', 'right']
                }],
            margin: [350, 0, 0, 0]
        }, {
            columns: [{
                width: '30%',
                text: 'Total',
                style: ['size08']
            }, {
                    width: '5%',
                    text: currency,
                    style: ['size08']
                }, {
                    width: '65%',
                    text: parseFloat(sum + useIncomeTax).toLocaleString(locale, locale.currency),
                    style: ['size08', 'right', 'bold']
                }],
            margin: [350, 0, 0, 0]
        },
        '\n'];

    var terbilang = {
        text: `Terbilang : ${Say(sum + useIncomeTax)}`,
        style: ['size09', 'bold']
    };

    var footer = ['\n',
        {
            columns: [
                {
                    width: '50%',
                    columns: [{
                        width: '35%',
                        text: 'Perjanjian Pembayaran',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: ':',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: moment(unitPaymentCorrection.unitPaymentOrder.dueDate).format(locale.date.format),
                            style: ['size08']
                        }]
                }, {
                    width: '50%',
                    columns: [{
                        width: '35%',
                        text: '',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: '',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: "",
                            style: ['size08']
                        }]
                }]
        }, {
            columns: [
                {
                    width: '50%',
                    columns: [{
                        width: '35%',
                        text: 'Nota',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: ':',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: `Nomor ${unitPaymentCorrection.invoiceCorrectionNo} ${moment(unitPaymentCorrection.invoiceCorrectionDate).format(locale.date.format)}`,
                            style: ['size08']
                        }]
                }, {
                    width: '50%',
                    columns: [{
                        width: '35%',
                        text: 'Barang Datang',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: ':',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: `${moment(sjDate).format(locale.date.format)} `,
                            style: ['size08']
                        }]
                }]
        }, {
            columns: [{
                width: '50%',
                columns: [{
                    width: '35%',
                    text: 'Keterangan',
                    style: ['size08']
                }, {
                        width: '3%',
                        text: ':',
                        style: ['size08']
                    }, {
                        width: '*',
                        text: unitPaymentCorrection.remark,
                        style: ['size08']
                    }]
            }, {
                    width: '50%',
                    columns: [{
                        width: '35%',
                        text: 'Nomor Nota Retur',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: ':',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: unitPaymentCorrection.returNoteNo,
                            style: ['size08']
                        }]
                }]
        }, '\n'];

    var signature = [{
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
                stack: ['Dibuat Oleh,', ' ', '\n\n\n\n', `(  ${unitPaymentCorrection._createdBy}  )`],
                style: ['center']
            }],
        style: ['size08']
    }, '\n', {
            text: `Dicetak Oleh ${unitPaymentCorrection._createdBy}`,
            style: ['size08']
        }];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'landscape',
        pageMargins: 20,
        content: [].concat(header, table, total, terbilang, footer, signature),
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
    }

    return dd;
}