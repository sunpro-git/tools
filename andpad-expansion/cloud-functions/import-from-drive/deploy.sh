#!/bin/bash
# Google Cloud Functionのデプロイ + Cloud Schedulerの設定
# 事前に gcloud auth login を実行しておくこと

PROJECT_ID="andpad-expansion"
REGION="asia-northeast1"
FUNCTION_NAME="import-from-drive"
SCHEDULER_JOB="import-from-drive-schedule"

# 1. Cloud Functionをデプロイ
gcloud functions deploy $FUNCTION_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --runtime=nodejs22 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=importFromDrive \
  --timeout=300s \
  --memory=512MB \
  --set-env-vars="SUPABASE_URL=https://vkovflhltggyrgimeabp.supabase.co" \
  --set-env-vars="GOOGLE_DRIVE_FOLDER_ID=1VkjlxdSKO5mSFUdYWVx6YK-WXczva3Af" \
  --source=.

echo ""
echo "デプロイ完了。SUPABASE_SERVICE_ROLE_KEYは手動で設定してください:"
echo "  gcloud functions deploy $FUNCTION_NAME --update-env-vars SUPABASE_SERVICE_ROLE_KEY=<your-key> --project=$PROJECT_ID --region=$REGION"
echo ""

# 2. Cloud Schedulerで20分おきに実行
# (Cloud Scheduler APIの有効化が必要)
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --project=$PROJECT_ID --region=$REGION --format='value(url)')

gcloud scheduler jobs create http $SCHEDULER_JOB \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="*/20 * * * *" \
  --uri="$FUNCTION_URL" \
  --http-method=POST \
  --time-zone="Asia/Tokyo" \
  --attempt-deadline=300s \
  || echo "スケジューラジョブが既に存在する場合は gcloud scheduler jobs update で更新してください"

echo ""
echo "セットアップ完了:"
echo "  Function URL: $FUNCTION_URL"
echo "  Schedule: 20分おき (*/20 * * * *)"
