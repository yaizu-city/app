const fs = require('fs');
const yaml = require('js-yaml');
const axios = require('axios');

const TILESERVER_ORIGINS = ['https://tileserver.geolonia.com', 'https://tileserver-dev.geolonia.com'];

const metadataKeys = [
  'fill',
  'fill-opacity',
  'fill-pattern',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'marker-symbol',
  'marker-size',
  'marker-color',
  'title',
  'minzoom',
  'maxzoom',
  'printzoom',
  'legendType'
];

const yaizuDataPNG = [
  {
    urlKey: 'shindobunpu',
    legendType: '震度分布',
  },
  {
    urlKey: 'ekijyouka',
    legendType: '液状化'
  },
  {
    urlKey: '4th-tsunami-shinsui',
    legendType: '静岡_津波_最大浸水深'
  },
  {
    urlKey: 'flood-max',
    legendType: '浸水深'
  },
  {
    urlKey: 'flood-planned',
    legendType: '浸水深'
  },
  {
    urlKey: 'flood-duration',
    legendType: '浸水継続時間'
  }
]

const generateLegendType = (dataRefUrl) => {
  // もし dataRefUrl に urlKey が含まれていたら、legendType を返す
  for (const item of yaizuDataPNG) {
    if (dataRefUrl.includes(item.urlKey)) {
      return item.legendType;
    }
  }
  return null;
}

const  generateShortId = (tileLayerName) => {
  // ハッシュ値を計算（djb2アルゴリズム）
  let hash = 5381;
  for (let i = 0; i < tileLayerName.length; i++) {
    hash = ((hash << 5) + hash) + tileLayerName.charCodeAt(i); // hash * 33 + c
  }
  hash = Math.abs(hash); // 負の値になった場合の対策

  // 使用する文字セット（62文字：数字・大文字・小文字）
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';

  // 3文字のIDを生成
  for (let i = 0; i < 3; i++) {
    id = chars[hash % chars.length] + id;
    hash = Math.floor(hash / chars.length);
  }

  return id;
};

const getAxiosHeaders = (url) => {
  for (const origin of TILESERVER_ORIGINS) {
    if (url.startsWith(origin)) {
      return { headers: { Origin: 'http://localhost:3000' } };
    }
  }
  return {};
};

const getTileIdFromTilesJson = async (item) => {

  const url = item.データ参照先;
  const id = `${item.大カテゴリー}_${item.中カテゴリー}_${item.メニュータイトル}`;

  if (url.includes('tiles.json')) {
    const res = await axios.get(url, getAxiosHeaders(url));
    return res.data.vector_layers[0].id;
  } else if (url.includes('{z}/{x}/{y}.png')) {
    return id;
  }
};

const determineDataType = (dataRefUrl) => {
  if (dataRefUrl.includes('{z}/{x}/{y}.png')) {
    // yaizu-smartmap-shindobunpu / yaizu-smartmap-ekijyouka / yaizu-smartmap-4th-tsunami-shinsui / _flood-max / _flood-duration が含まれている場合は datapng
    if (dataRefUrl.includes('yaizu-smartmap-shindobunpu') || dataRefUrl.includes('yaizu-smartmap-ekijyouka') || dataRefUrl.includes('yaizu-smartmap-4th-tsunami-shinsui') || dataRefUrl.includes('_flood-max') || dataRefUrl.includes('_flood-duration')) {
      return 'datapng';
    } else {
      return 'raster';
    }
  }
  if (dataRefUrl.includes('tiles.json') || dataRefUrl.includes('metadata.json')) return 'vector';
  throw new Error('対応していないデータ種別です。');
};

const createData = async (id, item) => {
  const tileId = await getTileIdFromTilesJson(item);
  const dataType = determineDataType(item.データ参照先);

  const data = { 
    id: id,
    type: 'data',
    tileId,
  };

  //"marker-symbol": markerSymbol, title, minzoom, maxzoom が存在すればをループで実行
  for (const key in item) {
    if (metadataKeys.includes(key)) {
      data.metadata = {
        ...data.metadata,
        [key]: item[key]
      }
    }
  }

  data.metadata = {
    ...data.metadata,
    dataType,
    tileUrl: item.データ参照先
  }

  const legendType = generateLegendType(item.データ参照先);
  if (legendType) {
    data.metadata.legendType = legendType;
  }

  if (tileId) {
    data.shortId = generateShortId(tileId)
  }

  return data;
}

const configToMenuYAML = async (config, outputFile) => {
  // const app = {
  //   name: 'スマートマップ',
  //   zoom: 12,
  //   center: [138.29255, 34.83344],
  //   minZoom: 9,
  //   maxZoom: 20,
  //   menus: {
  //     都市情報一覧: {
  //       metadata: {
  //         tileUrl: 'https://tileserver-dev.geolonia.com/yaizu-smartmap-20250107/tiles.json?key=YOUR-API-KEY',
  //         dataName: 'menu-experiment'
  //       },
  //       items: {}
  //     }
  //   }
  // };

  /***
   * 焼津市のための設定を一旦ハードコード
   * FIXME: この部分を外部から読み込むようにする
   */
  const app = {
    "name": "スマートマップ焼津",
    "zoom": 11.3,
    "center": [
      138.29294,
      34.84363
    ],
    "pitch": 0,
    "minZoom": 9,
    "maxZoom": 20,
    "menus": {
      "オープンプラットフォーム(fiware)": {
        "metadata": {
          "dataType": "fiware",
          "tileUrl": "https://d1m64mpovm6ox8.cloudfront.net"
        },
        "items": {
          "リアルタイム防災情報": {
            "id": "リアルタイム防災情報",
            "type": "category",
            "items": {
              "発令中の避難情報": {
                "id": "リアルタイム防災情報/発令中の避難情報",
                "type": "category",
                "items": {
                  "土砂災害": {
                    "id": "リアルタイム防災情報/発令中の避難情報/土砂災害",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationSediment",
                    "tileId": "yaizu-alert-area",
                    "shortId": "v74"
                  },
                  "洪水": {
                    "id": "リアルタイム防災情報/発令中の避難情報/洪水",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationFlood",
                    "tileId": "yaizu-alert-area",
                    "shortId": "tNa"
                  },
                  "高潮": {
                    "id": "リアルタイム防災情報/発令中の避難情報/高潮",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationStormSurge",
                    "tileId": "yaizu-alert-area",
                    "shortId": "rS8"
                  },
                  "地震": {
                    "id": "リアルタイム防災情報/発令中の避難情報/地震",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationEarthquake",
                    "tileId": "yaizu-alert-area",
                    "shortId": "7fQ"
                  },
                  "津波": {
                    "id": "リアルタイム防災情報/発令中の避難情報/津波",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationTsunami",
                    "tileId": "yaizu-alert-area",
                    "shortId": "qgK"
                  },
                  "原子力": {
                    "id": "リアルタイム防災情報/発令中の避難情報/原子力",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "EvacuationInformationNuclearPower",
                    "tileId": "yaizu-alert-area",
                    "shortId": "IpP"
                  }
                }
              },
              "避難所開設状況": {
                "id": "リアルタイム防災情報/発令中の避難情報/避難所開設状況",
                "type": "data",
                "dataType": "fiware",
                "dataId": "EvacuationShelter",
                "shortId": "wwQ"
              },
              "気象情報": {
                "id": "リアルタイム防災情報/気象情報",
                "type": "category",
                "items": {
                  "天候": {
                    "id": "リアルタイム防災情報/気象情報/天候",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "WeatherForecast",
                    "shortId": "Oue",
                    "metadata": {
                      "dataType": "Alert"
                    }
                  },
                  "警報・注意報": {
                    "id": "リアルタイム防災情報/気象情報/警報・注意報",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "WeatherAlert",
                    "shortId": "6wu",
                    "metadata": {
                      "dataType": "Alert"
                    }
                  }
                }
              },
              "雨量・水位観測情報": {
                "id": "リアルタイム防災情報/雨量・水位観測情報",
                "type": "category",
                "items": {
                  "雨量計": {
                    "id": "リアルタイム防災情報/雨量・水位観測情報/雨量計",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "PrecipitationGauge",
                    "shortId": "fEX",
                  },
                  "河川水位計": {
                    "id": "リアルタイム防災情報/雨量・水位観測情報/河川水位計",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "StreamGauge",
                    "shortId": "OAa",
                  },
                  "河川・海岸カメラ": {
                    "id": "リアルタイム防災情報/雨量・水位観測情報/河川・海岸カメラ",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "CameraInformation",
                    "shortId": "7QJ"
                  }
                }
              },
              "道路通行情報": {
                "id": "リアルタイム防災情報/道路通行情報",
                "type": "category",
                "items": {
                  "道路規制": {
                    "id": "リアルタイム防災情報/道路通行情報/道路規制",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "RestrictedTrafficAreaInformation",
                    "shortId": "aoy"
                  },
                  "地下道冠水状況": {
                    "id": "リアルタイム防災情報/道路通行情報/地下道冠水状況",
                    "type": "data",
                    "dataType": "fiware",
                    "dataId": "UnderpassInformation",
                    "shortId": "LEi"
                  }
                }
              }
            }
          },
          "災害パトロール": {
            "id": "災害パトロール",
            "type": "data",
            "dataType": "fiware",
            "dataId": "Disasterreports",
            "shortId": "6y9",
          }
        }
      },
      "焼津市データ": {
        "items": {}
      },
      "サードパーティ": {
        "metadata": {
          "dataName": "osm"
        },
        "items": {
          "OpenStreetMap情報": {
            "id": "OpenStreetMap情報",
            "type": "data",
            "layerIds": [
              "poi",
              "poi-z16",
              "poi-z16-primary",
              "poi-z15",
              "poi-z14",
              "poi-z13",
              "poi-worship-primary",
              "poi-worship",
              "poi-park",
              "poi-park-primary",
              "poi-airport-primary",
              "poi-railway"
            ],
            "dataType": "osm",
            "shortId": "a1B"
          }
        }
      }
    }
  };

  // FIXME: ハードコードを削除したタイミングで、app.menus['都市情報一覧'].items に修正する
  const menu = app.menus['焼津市データ'].items;

  for (const item of config) {
    const { 大カテゴリー, 中カテゴリー, メニュータイトル } = item;

    if (!大カテゴリー && 中カテゴリー) {
      throw new Error('中カテゴリーを指定する場合は、大カテゴリーも指定してください');
    }

    // 大カテゴリーがない場合は追加
    if (大カテゴリー && !menu[大カテゴリー]) {
      menu[大カテゴリー] = { id: 大カテゴリー, type: 'category', items: {} };
    }

    // 中カテゴリーがない場合は追加
    if (中カテゴリー && !menu[大カテゴリー].items[中カテゴリー]) {
      menu[大カテゴリー].items[中カテゴリー] = { id: `${大カテゴリー}/${中カテゴリー}`, type: 'category', items: {} };
    }

    if (メニュータイトル) {

      // 大・中カテゴリとメニュータイトルがある場合
      if (大カテゴリー && 中カテゴリー && メニュータイトル) {

        if (menu[大カテゴリー].items[中カテゴリー].items[メニュータイトル]) {
          throw new Error(`メニュータイトル: ${大カテゴリー}/${中カテゴリー}/${メニュータイトル} は重複しています`);
        }

        const data = await createData(`${大カテゴリー}/${中カテゴリー}/${メニュータイトル}`, item);

        menu[大カテゴリー].items[中カテゴリー].items[メニュータイトル] = data;
        continue;
      }

      if (大カテゴリー && メニュータイトル) {

        if (menu[大カテゴリー].items[メニュータイトル]) {
          throw new Error(`メニュータイトル: ${大カテゴリー}/${メニュータイトル} は重複しています`);
        }

        const data = await createData(`${大カテゴリー}/${メニュータイトル}`, item);
        menu[大カテゴリー].items[メニュータイトル] = data;
        continue;
      }

      if (メニュータイトル) {

        if (menu[メニュータイトル]) {
          throw new Error(`メニュータイトル: ${メニュータイトル} は重複しています`);
        }

        const data = await createData(メニュータイトル, item);
        menu[メニュータイトル] = data;

        continue;
      }
    } else {
      throw new Error('メニュータイトル が指定されていません');
    }
  };


  // 交通/バス/バス路線（自主運行）の凡例設定
  if (app.menus['焼津市データ'].items['交通'] && app.menus['焼津市データ'].items['交通'].items['バス'] && app.menus['焼津市データ'].items['交通'].items['バス'].items['バス路線']) {
    
    app.menus['焼津市データ'].items['交通'].items['バス'].items['バス路線'].metadata.legendTable = {
      "焼津循環線（ゆりかもめ・さつき）": { stroke: "#b6403a" },
      "大井川焼津線": { stroke: "#4b4b71" },
      "一色和田浜線": { stroke: "#7693a2" },
      "五十海大住線": { stroke: "#6f5f53" },
      "焼津岡部線": { stroke: "#654d67" },
      "焼津大島線": { stroke: "#d9da82" },
      "藤枝吉永線": { stroke: "#d7aa6d" },
      "藤枝相良線": { stroke: "#80667d" },
      "駅南循環善左衛門線(藤枝市自主運行バス)": { stroke: "#876172" }
    };
  }

  // 防災/内水浸水想定区域(公共下水道区域内)の凡例設定
  if (app.menus['焼津市データ'].items['防災'] && app.menus['焼津市データ'].items['防災'].items['内水浸水想定区域(公共下水道区域内)']) {
    app.menus['焼津市データ'].items['防災'].items['内水浸水想定区域(公共下水道区域内)'].metadata.stroke = 'rgba(0, 0, 0, 0)';
    app.menus['焼津市データ'].items['防災'].items['内水浸水想定区域(公共下水道区域内)'].metadata.legendTable = {
      "5.0m ~ 10.0m未満": { fill: "#FA9C9A", stroke: 'rgba(0, 0, 0, 0)' },
      "3.0m ~ 5.0m未満": { fill: "#FCC0BE", stroke: 'rgba(0, 0, 0, 0)' },
      "1.0m ~ 3.0m未満": { fill: "#FCDCC5", stroke: 'rgba(0, 0, 0, 0)' },
      "0.5m ~ 1.0m未満": { fill: "#F7E4AB", stroke: 'rgba(0, 0, 0, 0)' },
      "0.3m ~ 0.5m未満": { fill: "#F8F6AE", stroke: 'rgba(0, 0, 0, 0)' },
      "0.3m未満": { fill: "#FFFEB7" }
    };
  }

  const yamlStr = yaml.dump(app, {
    lineWidth: -1,
    noRefs: true,
    noCompatMode: true,
    quotingType: '"'
  });

  fs.writeFileSync(outputFile, yamlStr);
  console.log(`メニューファイルを ${outputFile} に出力しました。`);
}

const config_file = process.argv[2];
const output_file = process.argv[3];

if (!config_file || !output_file) {
  console.error('Usage: node configToMenuYAML <config_file> <output_file>');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
configToMenuYAML(config, output_file);
