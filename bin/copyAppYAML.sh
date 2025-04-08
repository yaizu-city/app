#!/usr/bin/env bash
set -ex

# S3 パス
SOURCE_S3="s3://dev-maps-yaizu-smartcity-jp-frontend-dev/app.yml"
DEST_S3="s3://maps-yaizu-smartcity-jp-frontend-v1/app.yml"

# ローカルファイル名
TMP_ORIGINAL="app.yml"
TMP_MODIFIED="app.smartmap.yml"

# 1. 開発環境バケットから app.yml をダウンロード
echo "⬇️ ダウンロード: $SOURCE_S3"
aws s3 cp "$SOURCE_S3" "$TMP_ORIGINAL"
if [ $? -ne 0 ]; then
  echo "❌ S3からのダウンロードに失敗しました"
  exit 1
fi

# 2. URLを置換
echo "🔁 URL置換を実行中..."
sed 's|https://yaizu-smartcity.jp/tiles/opendata/|https://yaizu-smartcity.jp/tiles/smartmap/|g' "$TMP_ORIGINAL" > "$TMP_MODIFIED"

# # 3. 本番環境バケットへアップロード
# echo "⬆️ アップロード: $DEST_S3"
# aws s3 cp "$TMP_MODIFIED" "$DEST_S3"
# if [ $? -eq 0 ]; then
#   echo "✅ アップロード完了"
# else
#   echo "❌ アップロードに失敗しました"
#   exit 1
# fi

# # 4. 一時ファイルを削除
# rm -f "$TMP_ORIGINAL" "$TMP_MODIFIED"
# echo "🧹 一時ファイルを削除しました"
