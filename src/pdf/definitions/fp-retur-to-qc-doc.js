var global = require('../../global');

module.exports = function (fpRetur, offset) {

    var items = [].concat.apply([], fpRetur.items);
    var details=[];
    var sumRetur=0;
    var sumLengthM=0;
    var sumLengthY=0;
    var sumWeight=0;

    for(var item of items){
        for(var detail of item.details){
            var itemDetail={
                productionOrderNo:item.productionOrderNo,
                item:detail,
                designName: detail.designCode ? detail.designCode + ' ' + detail.designNumber : "-"
            };
            details.push(itemDetail);
        }
    }
    
    for( var detail of details){
        sumRetur+=detail.item.returQuantity;
        sumLengthM+=detail.item.length;
        sumWeight+=detail.item.weight;
    }

    sumLengthY=sumLengthM / 0.9144;

    var locale = global.config.locale; 

    var moment = require('moment');
    moment.locale(locale.name); 

    var header = [{
        columns: [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'BON PENGANTAR',
                    style: ['size10'],
                    alignment: "center"
                }]
            }]

        }]
    }];

    var left=[
            {
                
                columns: [
                    {
                        width: '40%',
                        text: 'Kepada Yth. Bagian',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.destination,
                        style: ['size08']
                    }]
            },{
                columns: [
                    {
                        width: '40%',
                        text: '',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:'',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.remark,
                        style: ['size08']
                    }]
        }];
        var right=[
            {
                
                columns: [
                    {
                        width: '30%',
                        text: 'NO',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.returNo  ,
                        style: ['size08']
                    }]
            },{
                columns: [
                    {
                        width: '30%',
                        text: 'DO',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.deliveryOrderNo? fpRetur.deliveryOrderNo: "-",
                        style: ['size08']
                    }]
        }];

        var subheader=['\n',{
            columns: [{
                    width: '70%',
                    stack: [left]
                },{
                    width: '30%',
                    stack: [right]
                }]
        }];
    
    var thead = [{
        text: 'NO',
        style: 'tableHeader'
    },{
        text: 'MACAM BARANG',
        style: 'tableHeader'
    }, {
            text: 'DESIGN',
            style: 'tableHeader'
        }, {
            text: 'KET',
            style: 'tableHeader'
        }, {
            text: 'S.P',
            style: 'tableHeader'
        }, {
            text: 'C.W',
            style: 'tableHeader'
        }, {
            text: 'JML',
            style: 'tableHeader'
        }, {
            text: 'SAT',
            style: 'tableHeader'
        },{
            text: 'YARD',
            style: 'tableHeader'
        }, {
            text: 'METER',
            style: 'tableHeader'
        }, {
            text: 'KG',
            style: 'tableHeader'
        }];

    var tbody = details.map(function (detail, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size07', 'center']
        }, {
                text: detail.item.productName,
                style: ['size07', 'left']
            }, {
                text: detail.designName,
                style: ['size07', 'left']
            }, {
                text: detail.item.remark,
                style: ['size07', 'left']
            },{
                text: detail.productionOrderNo,
                style: ['size07', 'left']
            }, {
                text: detail.item.colorWay,
                style: ['size07', 'left']
            },{
                text: parseFloat(detail.item.returQuantity).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },{
                text: detail.item.uom,
                style: ['size07', 'center']
            },{
                text: parseFloat(detail.item.length / 0.9144).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },{
                text: parseFloat(detail.item.length).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },{
                text: parseFloat(detail.item.weight).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            }];
    });

    var tfoot = [[{
        text: "TOTAL",
        style: ['size07', 'right'],
        colSpan: 6
    }, "", "", "", "","",{
                text: parseFloat(sumRetur).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },"",{
                text: parseFloat(sumLengthY).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },{
                text: parseFloat(sumLengthM).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            },{
                text: parseFloat(sumWeight).toLocaleString(locale, locale.decimal),
                style: ['size07', 'center']
            }]];

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size07', 'center'],
            colSpan: 11
        }, "", "", "", "", "", "", "", "", "", ""]
    ];

    var table = [{
        table: {
            widths: ['4%', '18%', '10%', '8%', '12%', '7%', '8%', '8%','9%', '9%', '7%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var codeFG=fpRetur.finishedGoodCode ? fpRetur.finishedGoodCode: "-";
    sign=[{
                text: '[KODE : ' +  codeFG  + ' ]',
                style: ['size08', 'left']
            },{
            columns: [{
                width: '50%',
                stack: ['\n','Penerima ' , '\n\n\n', '(  .............................  )'],
                style: ['center']
            }, {
                    width: '50%',
                    stack: [`Surakarta, ${moment(fpRetur.date).add(offset,'h').format(locale.date.format)} `,'Dari Bagian: Gudang F.P', '\n\n\n', '(  .............................  )'],
                    style: ['center']
                }],
            style: ['size08']
        }];

    var retur = {
        pageSize: 'A6',
        pageOrientation: 'landscape',
        pageMargins: 20,
        content: [].concat(header,subheader,table, sign),
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
                fontSize: 7,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return retur;
}