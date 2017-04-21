var global = require('../../global');

module.exports = function (packing, offset) {

    var items = [].concat.apply([], packing.items);

    var iso = "FM.FP-GJ-15-003";
    // var number = packing.code;
    // var colorName = packing.colorName;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

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
    }, '\n'];

    var subheader = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'BON PENYERAHAN PRODUKSI',
                    style: ['size09', 'bold'],
                    alignment: "center",
                    decoration: 'underline'
                },
                    '\n',
                    {
                        text: iso,
                        style: ['size09', 'bold'],
                        alignment: "right"
                    },
                    '\n'
                ]
            }]

        }]
    }];

    var subheader2 = [{
        columns: [{
            width: '60%',
            columns: [{
                width: '*',
                stack: ['Kepada Yth. Bagian Penjualan ', 'Bersama ini kami kirimkan hasil produksi : Inspeksi Printing   '],
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
                    stack: ['No', 'Sesuai No Order'],

                }, {
                        width: '5%',
                        stack: [':', ':'],

                    }, {
                        width: '*',
                        stack: [packing.code, packing.productionOrderNo],

                    }],
                style: ['size08']

            }

        ]
    }];

    var thead = [{
        text: 'NO',
        style: 'tableHeader'
    },

        {
            text: 'BARANG',
            style: 'tableHeader'
        },
        {
            text: 'Jumlah (PCS)',
            style: 'tableHeader'
        },
        {
            text: 'Berat (Kg)',
            style: 'tableHeader'
        },
        {
            text: 'Panjang (Meter)',
            style: 'tableHeader'
        },
        {
            text: 'Keterangan',
            style: 'tableHeader'
        }

    ];


    var gradeItem = "";
    var totalJumlah = 0;
    var totalBerat = 0;
    var totalPanjang = 0;

    var tbody = items.map(function (item, index) {

        if (item.grade.toLowerCase() == "a" || item.grade.toLowerCase() == "b" || item.grade.toLowerCase() == "c") {
            gradeItem = "BQ";
        } else {
            gradeItem = "BS";
        }

        totalJumlah += item.quantity;
        totalBerat += item.weight;
        totalPanjang += item.length;

        return [{
            text: (index + 1).toString() || '',
            style: ['size08', 'center']
        },

            {
                text: packing.colorName + ' ' + item.lot + ' ' + item.grade + ' ' + gradeItem,
                style: ['size08', 'center']
            },
            {
                text: item.quantity,
                style: ['size08', 'center']
            },
            {
                text: item.weight,
                style: ['size08', 'center']
            },
            {
                text: item.length,
                style: ['size08', 'center']
            },
            {
                text: item.remark,
                style: ['size08', 'center']
            }

        ];
    });

    var tfoot = [[{
        text: " ",
        style: ['size08', 'center']
    }, {
        text: "Total",
        style: ['size08', 'center']
    },{
        text: totalJumlah,
        style: ['size08', 'center']
    } ,{
        text: totalBerat,
        style: ['size08', 'center']
    } ,{
        text: totalPanjang,
        style: ['size08', 'center']
    } , "",]];

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 6
        }, "", "", "", "", ""]
    ];

    var table = ['\n', {
        table: {
            widths: ['5%', '35%', '10%', '10%', '10%', '30%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot),
        }
    }];

    var footer = [{
        stack: [{
            columns: [{
                width: '40%',
                columns: [{
                    width: '25%',
                    stack: ['Buyer', 'Konstruksi', 'Design/Motif', 'Tujuan']
                }, {
                        width: '5%',
                        stack: [':', ':', ':', ':']
                    }, {
                        width: '*',
                        stack: [packing.buyer, packing.construction, packing.motif, packing.buyerLocation]
                    }]
            }]
        }
        ],
        style: ['size08']
    },
    ];


    var footer2 = ['\n', {
        columns: [{
            width: '25%',
            stack: ['Diterima oleh:', '\n\n\n\n', '(                               )'],
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
                stack: [`Sukoharjo, ${moment(packing.date).add(offset, 'h').format(locale.date.format)} `, 'Diserahkan oleh :', '\n\n\n', `(  ${packing._createdBy}  )`],
                style: ['center']
            }],
        style: ['size08']
    }];


    var packingPDF = {
        pageSize: 'A5',
        pageOrientation: 'landscape',
        pageMargins: 20,
        // content: [].concat(header, line, subheader, subheader2, table, footer),
        content: [].concat(header, line, subheader, subheader2, table, footer, footer2),

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
            size30: {
                fontSize: 30
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

    return packingPDF;
}