var global = require('../../global');

module.exports = function (fpRetur, offset) {

    var details = [].concat.apply([], fpRetur.details);
    var items=[];
    var sumRetur=0;
    var sumLengthM=0;
    var sumLengthY=0;
    var sumWeight=0;

    for(var detail of details){
        for(var item of detail.items){
            var itemDetail={
                productionOrderNo:detail.productionOrderNo,
                item:item,
                designName: item.designCode ? item.designCode + ' ' + item.designNumber : "-"
            };
            items.push(itemDetail);
        }
    }
    
    for( var item of items){
        sumRetur+=item.item.returQuantity;
        sumLengthM+=(item.item.length * item.item.returQuantity);
        sumWeight+=(item.item.weight * item.item.returQuantity);
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
                    text: 'BON PENERIMAAN BARANG',
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
                        width: '25%',
                        text: 'Tanggal',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:moment(fpRetur.date).add(offset,'h').format(locale.date.format),
                        style: ['size08']
                    }]
            },{
                columns: [
                    {
                        width: '25%',
                        text: 'Terima dari',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:`${fpRetur.destination} - ${fpRetur.buyer.name}`,
                        style: ['size08']
                    }]
        }];
        var center=[
            {
                
                columns: [
                    {
                        width: '100%',
                        text: 'Bagian : Penjualan DL',
                        style: ['size08']
                    }]
            }];
        var right=[
            {
                
                columns: [
                    {
                        width: '28%',
                        text: 'NO. SPK',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.spk ? fpRetur.spk : "-"  ,
                        style: ['size08']
                    }]
            },{
                columns: [
                    {
                        width: '28%',
                        text: 'NO.',
                        style: ['size08']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size08']
                    },
                    {
                        width: '*',
                        text:fpRetur.coverLetter ? fpRetur.coverLetter: "-",
                        style: ['size08']
                    }]
        }];

        var subheader=['\n',{
            columns: [{
                    width: '45%',
                    stack: [left]
                },{
                    width: '25%',
                    stack: [center]
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
            text: 'KET. BRG',
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
            text: 'YDS',
            style: 'tableHeader'
        }, {
            text: 'MTR',
            style: 'tableHeader'
        }, {
            text: 'KG',
            style: 'tableHeader'
        }];

    var tbody = items.map(function (detail, index) {
        return [{
            text: (index + 1).toString() || '',
            style: ['size06', 'center']
        }, {
                text: detail.item.productName,
                style: ['size06', 'left']
            }, {
                text: detail.designName,
                style: ['size06', 'left']
            }, {
                text: detail.item.productDescription,
                style: ['size06', 'left']
            }, {
                text: detail.item.remark,
                style: ['size06', 'left']
            },{
                text: detail.productionOrderNo,
                style: ['size06', 'left']
            }, {
                text: detail.item.colorWay,
                style: ['size06', 'left']
            },{
                text: parseFloat(detail.item.returQuantity).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },{
                text: detail.item.uom,
                style: ['size06', 'center']
            },{
                text: parseFloat((detail.item.length * detail.item.returQuantity) / 0.9144).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },{
                text: parseFloat(detail.item.length * detail.item.returQuantity).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },{
                text: parseFloat(detail.item.weight * detail.item.returQuantity).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            }];
    });

    var tfoot = [[{
        text: "TOTAL",
        style: ['size07', 'right'],
        colSpan: 7
    }, "", "", "", "","","",{
                text: parseFloat(sumRetur).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },"",{
                text: parseFloat(sumLengthY).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },{
                text: parseFloat(sumLengthM).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            },{
                text: parseFloat(sumWeight).toLocaleString(locale, locale.decimal),
                style: ['size06', 'center']
            }]];

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size07', 'center'],
            colSpan: 11
        }, "", "", "", "", "", "", "", "", "", "",""]
    ];

    var table = [{
        table: {
            widths: ['3%', '18%', '10%', '8%', '8%', '12%', '7%', '8%', '6%','8%', '8%', '6%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var codeFG=fpRetur.codeProduct ? fpRetur.codeProduct: "-";
    sign=[{
                text: '[KODE : ' +  codeFG  + ' ]',
                style: ['size08', 'left']
            },{
            columns: [{
                width: '50%',
                stack: ['\n','Mengetahui ' , '\n\n\n', '(  .............................  )'],
                style: ['center']
            }, {
                    width: '50%',
                    stack: ['\n','Yang Menerima', '\n\n\n', '(  .............................  )'],
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