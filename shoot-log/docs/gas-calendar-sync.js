/**
 * KANSETSU カレンダー同期 API (イベント削除対応版)
 * アプリ側で指定された内容に従ってイベントを作成・更新・削除します。
 *
 * アクション:
 *   通常     — title/startTime 必須。既存イベントがあれば更新、なければ新規作成
 *   delete   — id のみ必須。description 内の ID が完全一致するイベントを削除
 *   deleteAll— id のみ必須。description 内の ID が前方一致するイベントを全削除（見学会 _oh_ 含む）
 */
function doPost(e) {
  const response = { success: false, message: '', createdCount: 0, errors: [], debugInfo: [] };

  try {
    if (!e || !e.postData) throw new Error("POSTデータがありません");
    const data = JSON.parse(e.postData.contents);
    if (!Array.isArray(data)) throw new Error("データ形式が正しくありません");
    const calendar = CalendarApp.getDefaultCalendar();
    let count = 0;
    const SEARCH_RANGE_MONTHS = 6;

    data.forEach(item => {

      // ========== 削除処理 ==========
      if ((item.action === 'delete' || item.action === 'deleteAll') && item.id) {
        const targetId = 'ID: ' + item.id;
        const now = new Date();
        const searchStart = new Date(now);
        searchStart.setMonth(searchStart.getMonth() - SEARCH_RANGE_MONTHS);
        const searchEnd = new Date(now);
        searchEnd.setMonth(searchEnd.getMonth() + SEARCH_RANGE_MONTHS);
        const potentialEvents = calendar.getEvents(searchStart, searchEnd);

        for (const event of potentialEvents) {
          const eventDesc = event.getDescription();
          if (!eventDesc) continue;
          // deleteAll: 前方一致（ID: abc123 → abc123_oh_xxx も削除）
          // delete:    完全一致（ID: abc123_oh_2026-03-01 のみ削除）
          const isMatch = item.action === 'deleteAll'
            ? eventDesc.includes(targetId)
            : eventDesc.endsWith(targetId);
          if (isMatch) {
            try {
              event.deleteEvent();
              count++;
            } catch (delErr) {
              response.errors.push('削除失敗: ' + delErr.toString());
            }
          }
        }
        Utilities.sleep(200);
        return;
      }

      // ========== 通常の作成/更新処理 ==========

      // 必須項目のチェック
      if (!item.title || !item.startTime) return;
      const title = item.title;
      const newStartTime = new Date(item.startTime);
      let newEndTime = item.endTime ? new Date(item.endTime) : new Date(newStartTime.getTime() + 1 * 60 * 60 * 1000); // デフォルト1時間

      if (newEndTime <= newStartTime) {
         newEndTime = new Date(newStartTime.getTime() + 1 * 60 * 60 * 1000);
      }
      // 識別用ID
      const recordIdInfo = item.id ? `ID: ${item.id}` : '';

      // 説明文の構築
      let description = item.description || '';
      const systemTag = '[設営管理]';
      if (description) description += '\n\n';
      description += `${systemTag}\n${recordIdInfo}`;

      // ゲストリスト（アプリから送られたものをそのまま使う）
      const guests = item.guests || '';
      const options = {
        location: item.location || '',
        description: description,
        guests: guests
      };

      // --- 既存イベントの検索と特定 (移動対応) ---
      let targetEvent = null;
      let isUpdate = false;
      if (item.id) {
        const searchStart = new Date(newStartTime);
        searchStart.setMonth(searchStart.getMonth() - SEARCH_RANGE_MONTHS);
        const searchEnd = new Date(newStartTime);
        searchEnd.setMonth(searchEnd.getMonth() + SEARCH_RANGE_MONTHS);
        const potentialEvents = calendar.getEvents(searchStart, searchEnd);
        for (const event of potentialEvents) {
          const eventDesc = event.getDescription();
          // IDと、イベントタイプ(設営/撤収など)が一致するものを探す
          if (eventDesc && eventDesc.includes(recordIdInfo)) {
             // タイトルの種別（【設営】など）が一致するか確認
             const eventTitle = event.getTitle();
             const typeTag = title.match(/^【.*?】/);
             if (typeTag && eventTitle.startsWith(typeTag[0])) {
               targetEvent = event;
               isUpdate = true;
               break;
             }
          }
        }
      }

      // --- 登録 または 更新 ---
      if (isUpdate && targetEvent) {
        targetEvent.setTime(newStartTime, newEndTime);
        targetEvent.setTitle(title);
        targetEvent.setLocation(options.location);
        targetEvent.setDescription(options.description);

        // ゲストの再設定
        if (guests) {
          guests.split(',').forEach(email => {
            if(email && email.trim()) try { targetEvent.addGuest(email.trim()); } catch(e){}
          });
        }
      } else {
        calendar.createEvent(title, newStartTime, newEndTime, options);
      }
      count++;
      Utilities.sleep(200);
    });

    response.success = true;
    response.createdCount = count;

    if (response.errors.length > 0) {
      response.message = `${count}件処理しましたが、エラーがありました:\n` + response.errors.join('\n');
    } else {
      response.message = `${count}件の予定を更新しました`;
    }
  } catch (err) {
    response.message = "システムエラー: " + err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
