var global = require('../../global');

module.exports = function (kanban) {

    var steps = [].concat.apply([], kanban.instruction.steps);

    var iso = "FM-F-PR-09-01-016B/R2";
    var number = kanban.no;

    var locale = global.config.locale; 

    var moment = require('moment');
    moment.locale(locale.name); 

    var orderNo = kanban.productionOrder.orderNo;
    var buyer = kanban.productionOrder.buyer.name;
    var color = kanban.selectedProductionOrderDetail.colorType ? kanban.selectedProductionOrderDetail.colorRequest + " - " + kanban.selectedProductionOrderDetail.colorType.name : kanban.selectedProductionOrderDetail.colorRequest; 
    var standardHandfeel = kanban.productionOrder.handlingStandard;
    var finishWidth = kanban.productionOrder.finishWidth;
    var material = kanban.productionOrder.material.name;
    var yarnNumber = kanban.productionOrder.yarnMaterial.name;
    var grade = kanban.grade;
    var cartQty = kanban.cart.qty;
    var cartNumber = kanban.cart.cartNumber;

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
                }, {
                        text: '\n',
                        style: ['size09'],
                        alignment: "center"
                    }]
            }]

        }]
    }];

    var subheader = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: iso,
                    style: ['size09', 'bold'],
                    alignment: "right"
                },
                    {
                        text: 'KARTU PENGANTAR PROSES PRODUKSI',
                        style: ['size09', 'bold'],
                        alignment: "center",
                        decoration: 'underline'
                },
                    {
                        text: '\n',
                        style: ['size09'],
                        alignment: "center",
                    }]
            }]

        }]
    }];

    var subheader2 = [{
        columns: [
            {
                width: '50%',
                columns: [{
                    width: '35%',
                    stack: ['NO ORDER', 'BUYER' , 'WARNA', 'STANDARD HANDFEEL', 'LEBAR FINISH']
                }, {
                        width: '5%',
                        stack: [':', ':', ':', ':', ':']
                    }, {
                        width: '*',
                        stack: [orderNo, buyer, color, standardHandfeel, finishWidth]
                    }],
                style: ['size08']
            },
            {
                width: '50%',
                columns: [{
                    width: '35%',
                    stack: ['MATERIAL', 'NO BENANG' , 'GRADE', 'PANJANG', 'NO KERETA']
                }, {
                        width: '5%',
                        stack: [':', ':', ':', ':', ':']
                    }, {
                        width: '*',
                        stack: [material, yarnNumber , grade, cartQty, cartNumber]
                    }],
                style: ['size08']
            }
        ]
    }];

    var thead = [{
            text: 'TGL',
            style: 'tableHeader'
        }, {
            text: 'MESIN',
            style: 'tableHeader'
        }, {
            text: 'SHIFT',
            style: 'tableHeader'
        }, {
            text: 'KETERANGAN',
            style: 'tableHeader'
        }, {
            text: 'NAMA',
            style: 'tableHeader'
        }, {
            text: 'PARAF',
            style: 'tableHeader'
        }, {
            text: 'FLOW PROSES',
            style: 'tableHeader',
            colSpan: 2}, ''
    ];

    var tbody = (function() {
        var flowProcess = [];

        for (var step of steps){
            var stepCell = getStepCell(step.process);
            flowProcess.push(getFlowProcess(stepCell, ''));
            flowProcess.push(getFlowProcess('', ''));
            
            var leftColumn = [];
            var rightColumn = [];

            for (i=0;i<step.stepIndicators.length;i++){
                var stepIndicatorCell = getStepIndicatorCell(step.stepIndicators[i].name, step.stepIndicators[i].value, step.stepIndicators[i].uom);
                if (i % 2 > 0)
                    rightColumn.push(stepIndicatorCell);
                else
                    leftColumn.push(stepIndicatorCell);
            }

            if (leftColumn.length > rightColumn.length){
                rightColumn.push('');
            }
            for (i=0;i<leftColumn.length;i++){
                flowProcess.push(getFlowProcess(leftColumn[i], rightColumn[i]));
            }
        }
        console.log(flowProcess);
        return flowProcess;
    })();

    function getFlowProcess(leftCell, rightCell){
        return [getTableCell('\n'), getTableCell(''), getTableCell(''), getTableCell(''), getTableCell(''), getTableCell(''), leftCell, rightCell];
    }

    function getTableCell(cellValue){
        return {
            text: cellValue,
            style: ['size08', 'center']
        };
    }

    function getStepCell(cellValue){
        return {
            text: cellValue,
            margin: [0, 5],
            style: ['size08', 'center'],
            colSpan:2,
            rowSpan:2
        };
    }

    function getStepIndicatorRow(leftCell, rightCell) {
        return {columns: [leftCell, rightCell]};
    }

    function getStepIndicatorCell(name, value, uom){
        var valueInUom = uom ? value + " " + uom : value;
        return {
            width:'100%',
            columns: [{
                        width: '*',
                        text: name
                    }, {
                        width: '5%',
                        text: ':'
                    }, {
                        width: '30%',
                        text: valueInUom
                    }],
            style: ['size08']
        };
    }        


    var table = [{
        table: {
            widths: ['2%', '4%', '4%', '*', '4%', '4%', '30%', '30%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];
        
    var tbody2 = [];

    var theader2 = [
        {text: '\nNO PCS', style: 'tableHeader', rowSpan:2, alignment: 'center'}, 
        {text: 'PANJANG', style: 'tableHeader', colSpan: 3, alignment: 'center'}, '', '',
        {text: 'SG', style: 'tableHeader', alignment: 'center'},
        {text: '\nCBR', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nMERCERIZE', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nWD', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nSTENTER', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nPRINT', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nSTEAM', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nWASHING', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nSTENTER', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nSANFOR', style: 'tableHeader', rowSpan:2, alignment: 'center'},
        {text: '\nQC', style: 'tableHeader', rowSpan:2, alignment: 'center'}
    ]

    var theader3 = [
        '', 
        {text: 'ASLI', style: 'tableHeader', alignment: 'center'}, 
        {text: 'GRADE', style: 'tableHeader', alignment: 'center'}, 
        {text: 'CHECK', style: 'tableHeader', alignment: 'center'}, 
        {text: 'DESIZING', style: 'tableHeader', alignment: 'center'}, 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
    ]

    function getIndexedRow(index){
        return [
            {text: index, style: ["size06"], alignment: 'center'}, '', '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            ''
        ]
    }
        
    function getFooter(label){
        return [
            {text: label, style: 'tableHeader', colSpan:3, alignment: 'center'}, 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            '', 
            ''
        ]
    }
        
    var tfooter2 = getFooter('\nPARAF CHECK\n\n')
    var tfooter3 = getFooter('\n\n\nKETERANGAN\n\n\n\n')
        
    tbody2.push(theader2);
    tbody2.push(theader3);
    for (i = 1; i <= 20; i++) { 
        tbody2.push(getIndexedRow(i))
    }
    tbody2.push(tfooter2);
    tbody2.push(tfooter3);

    var table2 = [{table: {
                            headerRows: 2,
                            body: tbody2
                        }
                    }];
                
    var pageBreak = [{text:'\n\n'}];	

    var kanbanPDFDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: 10,
            content: [].concat(header, subheader, subheader2, table, pageBreak, table2),
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

    return kanbanPDFDefinition;
}