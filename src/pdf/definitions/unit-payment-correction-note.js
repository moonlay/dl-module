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
            prNo: item.purchaseOrder.purchaseRequest.no,
        };
    });

    items = [].concat.apply([], items);

    var currency = unitPaymentCorrection.items.find(r => true).currency.symbol;
    var urDates = unitPaymentCorrection.unitPaymentOrder.items.map(unitPaymentOrderItem => {
        return new Date(unitPaymentOrderItem.unitReceiptNote.date)
    })
    var sjDate = Math.max.apply(null, urDates); 

    var locale = global.config.locale;  

    var moment = require('moment');
    moment.locale(locale.name); 

    var numberLocaleOptions = {
        style: 'decimal',
        maximumFractionDigits: 4,

    }; 
    var header = [
        {
            columns: [{
                width: '50%',
                text: 'DAN LIRIS',
                style: ['size15', 'bold']
            }, {
                    text: 'NOTA DEBET',
                    style: ['size15', 'bold']

                }]
        }, {
            columns: [{
                width: '60%',
                stack: [
                    'INDUSTRIAL & TRADING CO.LTD. ',
                    'Kel. Banaran Kec. Grogol Kab. Sukoharjo',
                    'Telp. (0271) 714400'
                ],
                style: ['size08']
            }, {
                    width: '*',
                    stack: [
                        `SUKOHARJO, ${moment(unitPaymentCorrection.unitPaymentOrder.date).format(locale.date.format)}`,
                        `(${unitPaymentCorrection.unitPaymentOrder.supplier.code}) ${unitPaymentCorrection.unitPaymentOrder.supplier.name}`,
                        `${unitPaymentCorrection.unitPaymentOrder.supplier.address}`],
                    alignment: 'right',
                    style: ['size08']

                }]
        }, '\n', {
            columns: [{
                width: '50%',
                text: `Retur/Potongan ${unitPaymentCorrection.unitPaymentOrder.category.name}`,
                style: ['size09']
            }, {
                    width: '40%',
                    text: `NO. ${unitPaymentCorrection.no}`,
                    style: ['size09', 'bold']
                }]
        }, {
            width: '*',
            text: `Untuk : (${unitPaymentCorrection.unitPaymentOrder.unit.code}) ${unitPaymentCorrection.unitPaymentOrder.unit.subDivision}`,
            style: ['size09']
        }, '\n'
    ];

    var thead = [
        {
            text: 'No.',
            style: 'tableHeader'
        }, {
            text: 'Banyak',
            style: 'tableHeader'
        }, {
            text: 'Keterangan',
            style: 'tableHeader'
        }, {
            text: 'Harga',
            style: 'tableHeader'
        }, {
            text: 'Jumlah',
            style: 'tableHeader'
        }, {
            text: 'Nomor Order',
            style: 'tableHeader'
        }
    ];

    var tbody = items.map(function (item,index) { 
        return [{
            text: (index+1).toString() || '',
            style: ['size07', 'center']
        }, {
                text: `${item.quantity} ${item.uom.unit}`,
                style: ['size07', 'right']
            }, {
                text: item.product.name,
                style: ['size07', 'left']
            }, {
                text: parseFloat(item.pricePerUnit).toLocaleString(locale, locale.currency),
                style: ['size07', 'right']
            }, {
                text: parseFloat(item.priceTotal).toLocaleString(locale, locale.currency),
                style: ['size07', 'right']
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
            widths: ['5%', '15%', '35%', '15%', '15%', '15%'],
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
        columns: [{
            width: '10%',
            text: 'Terbilang :',
            style: ['size08']
        }, {
                text: Say(sum + useIncomeTax),
                style: ['size08', 'justify']
            }]
    };

    var footer = ['\n', {
                text: `Perjanjian Pembayaran : ${moment(unitPaymentCorrection.unitPaymentOrder.dueDate).format(locale.date.format)}`,
                style: ['size08']
            }, {
            columns: [{
                width: '50%',
                columns: [{
                    width: '10%',
                    text: 'Nota',
                    style: ['size08']
                }, {
                        width: '3%',
                        text: ':',
                        style: ['size08']
                    }, {
                        width: '*',
                        text: `NO ${unitPaymentCorrection.invoiceCorrectionNo} ${moment(unitPaymentCorrection.invoiceCorrectionDate).format(locale.date.format)}`,
                        style: ['size08']
                    }]
            }, {
                    width: '50%',
                    columns: [{
                        width: '15%',
                        text: 'Brg Dtg',
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
                    width: '10%',
                    text: 'Ket',
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
                        width: '15%',
                        text: 'NT',
                        style: ['size08']
                    }, {
                            width: '3%',
                            text: ':',
                            style: ['size08']
                        }, {
                            width: '*',
                            text: unitPaymentCorrection.unitCoverLetterNo,
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