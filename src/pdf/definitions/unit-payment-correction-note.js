var say = require('../../utils/say');
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
    var iso = "FM-PB-00-06-015/R1";
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
                        {
                            text: iso,
                            style: ['size09', 'bold']
                        },
                        `SUKOHARJO, ${moment(unitPaymentCorrection.date).format(locale.date.format)}`,
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
            style: ['size08', 'center']
        }, {
                text: item.product.name,
                style: ['size08', 'left']
            }, {
                text: `${item.quantity} ${item.uom.unit}`,
                style: ['size08', 'right']
            }, {
                columns: [{
                    width: '20%',
                    text: currency,
                    style: ['size08']
                }, {
                        width: '*',
                        text: parseFloat(item.pricePerUnit).toLocaleString(locale, locale.currency),
                        style: ['size08', 'right']
                    }]
            }, {
                columns: [{
                    width: '20%',
                    text: currency,
                    style: ['size08']
                }, {
                        width: '*',
                        text: parseFloat(item.priceTotal).toLocaleString(locale, locale.currency),
                        style: ['size08', 'right']
                    }]
            }, {
                text: item.prNo,
                style: ['size08', 'left']
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

    var _jumlah = (items.length > 0 ? items : [initialValue])
        .map(item => item.priceTotal)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var useIncomeTax = unitPaymentCorrection.useIncomeTax ? _jumlah * 0.1 : 0;
    var useVAT = unitPaymentCorrection.useVat ? _jumlah * (unitPaymentCorrection.unitPaymentOrder.vatRate / 100) : 0;
    var _subTotal = _jumlah;
    var summary = _jumlah;

    if (unitPaymentCorrection.correctionType === "Jumlah") {
        if (unitPaymentCorrection.useIncomeTax) {
            _subTotal = _subTotal + useIncomeTax;
            summary = _subTotal;
        }
        if (unitPaymentCorrection.useVat) {
            summary = summary - useVAT;
        }
    } else {
        if (unitPaymentCorrection.useIncomeTax) {
            _subTotal = _subTotal + useIncomeTax;
            summary = _subTotal;
        }
        if (unitPaymentCorrection.useVat) {
            summary = summary - useVAT;
        }
    }

    var jumlah = {
        columns: [{
            width: '20%',
            text: 'Jumlah',
            style: ['size08']
        }, {
                width: '20%',
                text: currency,
                style: ['size08']
            }, {
                width: '60%',
                text: parseFloat(_jumlah).toLocaleString(locale, locale.currency),
                style: ['size08', 'right']
            }]
    };

    var incometaxTotal = {
        columns: [{
            width: '20%',
            text: 'PPn 10%',
            style: ['size08']
        }, {
                width: '20%',
                text: unitPaymentCorrection.useIncomeTax ? currency : " ",
                style: ['size08']
            }, {
                width: '60%',
                text: unitPaymentCorrection.useIncomeTax ? parseFloat(useIncomeTax).toLocaleString(locale, locale.currency) : "-",
                style: ['size08', 'right']
            }]
    };

    var vatTotal = {
        columns: [{
            width: '50%',
            text: `PPh ${unitPaymentCorrection.unitPaymentOrder.vat.name} ${unitPaymentCorrection.unitPaymentOrder.vatRate} %`,
            style: ['size08']
        }, {
                width: '20%',
                text: currency,
                style: ['size08']
            }, {
                width: '*',
                text: parseFloat(useVAT).toLocaleString(locale, locale.currency),
                style: ['size08', 'right']
            }]
    };

    var vatBayar = {
        columns: [{
            width: '50%',
            text: `Jumlah dibayar Ke Supplier`,
            style: ['size08']
        }, {
                width: '20%',
                text: currency,
                style: ['size08']
            }, {
                width: '*',
                text: parseFloat(summary).toLocaleString(locale, locale.currency),
                style: ['size08', 'right']
            }]
    };

    var subTotal = {
        columns: [{
                width: '20%',
                text: 'Total',
                style: ['size08']
            }, {
                width: '20%',
                text: currency,
                style: ['size08']
            }, {
                width: '60%',
                text: parseFloat(_subTotal).toLocaleString(locale, locale.currency),
                style: ['size08', 'right', 'bold']
            }]
    };

    var total = [];

    if (unitPaymentCorrection.correctionType === "Jumlah") {
        total = ['\n',{
            columns: [
                {
                    width: '40%',
                    stack: ['\n', unitPaymentCorrection.useVat ? vatTotal : '', unitPaymentCorrection.useVat ? vatBayar : '\n']
                },
                {
                    width: '20%',
                    text: ''
                },
                {
                    width: '40%',
                    stack: [jumlah, incometaxTotal, subTotal]
                }
            ],
            style: ['size08']
        },'\n'];

    } else {
        total = ["\n",{
            columns: [
                {
                    width: '40%',
                    stack: ['\n', unitPaymentCorrection.useVat ? vatTotal : '', unitPaymentCorrection.useVat ? vatBayar : '']
                },
                {
                    width: '20%',
                    text: ''
                },
                {
                    width: '40%',
                    stack: [jumlah, incometaxTotal, subTotal]
                }
            ],
            style: ['size08']
        },"\n"];
    }

    var terbilang = {
        text: `Terbilang : ${say(summary, unitPaymentCorrection.items.find(r => true).currency.description)}`,
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
                            text: `${unitPaymentCorrection.unitPaymentOrder.no}`,
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