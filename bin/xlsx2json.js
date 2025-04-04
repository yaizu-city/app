const XLSX = require('xlsx');
const fs = require('fs');

const parse = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // ダウンロードコード と テストTippecannoeコードを除外
    data.forEach((d) => {
        delete d['ダウンロードコード'];
        delete d['テストTippecannoeコード'];
    });
    return data;
}

// 引数に指定されたExcelファイルを読み込み、JSONに変換して出力する
const config_file = process.argv[2];

if (!config_file) {
    console.error('Usage: node xlsx2json <config_file>');
    process.exit(1);
}

const main = async () => {

    const config = parse(config_file);
    fs.writeFileSync('data.json', JSON.stringify(config, null, 2));
}

main();
