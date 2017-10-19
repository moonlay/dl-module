var global = require('../../global');

module.exports = function (shipmentDocument, offset) {

    var iso = "FM.FP-GJ-15-005";

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var data = shipmentDocument;

    var header = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'PT DAN LIRIS',
                    style: ['size15'],
                    alignment: "center"
                }, {
                    text: 'BANARAN, GROGOL, SUKOHARJO',
                    style: ['size09'],
                    alignment: "center"
                }]
            }]

        }]
    }];

    var line = [{
        canvas: [{
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 555,
            y2: 5,
            lineWidth: 0.5
        }
        ]
    }];

    var subheader = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'BON PENGIRIMAN BARANG',
                    style: ['size09', 'bold'],
                    alignment: "center",
                    decoration: 'underline'
                },
                {
                    text: iso,
                    style: ['size09', 'bold'],
                    alignment: "right"
                }
                ]
            }]

        }]
    }];

    var subheader2 = [{
        columns: [{
            width: '60%',
            columns: [{
                width: '*',
                stack: ['Kepada Yth. Bagian Penjualan ', `U/ dikirim kepada: ${data.buyerName ? data.buyerName : ""}`],
            }],
            style: ['size08']
        }
            ,
        {
            width: '5%',
            text: ''
        },
        {
            width: '40%',
            columns: [{
                width: '40%',
                stack: ['NO.', 'Sesuai DO. No.'],

            }, {
                width: '5%',
                stack: [':', ':'],

            }, {
                width: '*',
                stack: [data.shipmentNumber ? data.shipmentNumber : "", data.deliveryCode ? data.deliveryCode : ""],

            }],
            style: ['size08']

        }

        ]
    }];

    var thead = [{
        text: 'MACAM BARANG',
        style: 'tableHeader'
    },
    {
        text: 'DESIGN',
        style: 'tableHeader'
    },
    {
        text: 'S.P',
        style: 'tableHeader'
    },
    {
        text: 'C.W',
        style: 'tableHeader'
    },
    {
        text: 'SATUAN',
        style: 'tableHeader'
    },
    {
        text: `KUANTITI`,
        style: 'tableHeader'
    },
    {
        text: 'PANJANG TOTAL\n(m)',
        style: 'tableHeader'
    },
    {
        text: 'BERAT TOTAL\n(Kg)',
        style: 'tableHeader'
    }
    ];


    var gradeItem = "";
    var totalJumlah = 0;
    var totalBerat = 0;
    var totalPanjang = 0;

    var tbody = [];

    for (var i = 0; i < data.details.length; i++) {
        for (var j = 0; j < data.details[i].items.length; j++) {
            var weightTotal = data.details[i].items[j].quantity * data.details[i].items[j].weight;
            var lengthTotal = data.details[i].items[j].quantity * data.details[i].items[j].length;
            var objArr = [{
                text: data.details[i].items[j].productName,
                style: ['size08', 'center']
            },
            {
                text: data.details[i].designNumber,
                style: ['size08', 'center']
            },
            {
                text: data.details[i].productionOrderNo,
                style: ['size08', 'center']
            },
            {
                text: data.details[i].items[j].colorType,
                style: ['size08', 'center']
            },
            {
                text: data.details[i].items[j].uomUnit,
                style: ['size08', 'center']
            },
            {
                text: data.details[i].items[j].quantity,
                style: ['size08', 'center']
            },
            {
                text: lengthTotal.toFixed(2),
                style: ['size08', 'center']
            },
            {
                text: weightTotal.toFixed(2),
                style: ['size08', 'center']
            }]

            totalJumlah += data.details[i].items[j].quantity;
            totalBerat += weightTotal;
            totalPanjang += lengthTotal;

            weightTotal = 0;
            lengthTotal = 0;

            tbody.push(objArr);
            objArr = [];
        }
    }

    var tfoot = [[{
        colSpan: 5,
        text: "Total",
        style: ['size08', 'center']
    }, {
        text: "",
        style: ['size08', 'center']
    }, {
        text: "",
        style: ['size08', 'center']
    }, {
        text: "",
        style: ['size08', 'center']
    }, {
        text: "",
        style: ['size08', 'center']
    }, {
        text: totalJumlah.toFixed(2),
        style: ['size08', 'center']
    }, {
        text: totalPanjang.toFixed(2),
        style: ['size08', 'center']
    }, {
        text: totalBerat.toFixed(2),
        style: ['size08', 'center']
    }]];

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 6
        }, "", "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ['30%', '10%', '10%', '10%', '10%', '10%', '10%', '10%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot),
        }
    }];

    var footer = ["\n", {
        stack: [{
            columns: [{
                columns: [{
                    width: '25%',
                    stack: ['Di Ball / Lose Packing / Karton', 'Netto: ....... Kg Bruto: ......... Kg']
                }, {
                    width: '2%',
                    stack: ["", ""]
                }, {
                    width: '*',
                    stack: ["", ""]
                }]
            }]
        }
        ],
        style: ['size08']
    }];


    var footer2 = ['\n', {
        columns: [{
            width: '25%',
            stack: ['Mengetahui', 'Kasubsie Gudang Jadi', '\n\n\n\n', '(                  )'],
            style: ['center']
        },
        {
            width: '25%',
            stack: [],
        },
        {
            width: '25%',
            stack: [],
        },

        {
            width: '25%',
            stack: [`Sukoharjo, ${moment(data._createdDate).add(offset, 'h').format(locale.date.format)} `, 'Petugas Gudang', '\n\n\n\n', `(  ${data._createdBy}  )`],
            style: ['center']
        }],
        style: ['size08']
    }];


    var dataPdf = {
        pageSize: 'A5',
        pageOrientation: 'landscape',
        pageMargins: 20,
        // content: [].concat(header, line, subheader, subheader2, table, footer),
        content: [].concat(header, line, subheader, subheader2, table, footer, footer2),

        styles: {
            size06: {
                fontSize: 8
            },
            size07: {
                fontSize: 9
            },
            size08: {
                fontSize: 10
            },
            size09: {
                fontSize: 11
            },
            size10: {
                fontSize: 12
            },
            size15: {
                fontSize: 17
            },
            size30: {
                fontSize: 32
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
                fontSize: 10,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return dataPdf;
}