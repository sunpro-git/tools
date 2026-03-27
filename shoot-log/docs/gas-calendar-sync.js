/**
 * KANSETSU カレンダー同期 API (イベント削除対応版)
 * アプリ側で指定された内容に従ってイベントを作成・更新・削除します。
 *
 * アクション:
 *   GET      — [設営管理] タグ付きイベントの一覧を返却
 *   通常     — title/startTime 必須。既存イベントがあれば更新、なければ新規作成
 *   delete   — id のみ必須。description 内の ID が完全一致するイベントを削除
 *   deleteAll— id のみ必須。description 内の ID が前方一致するイベントを全削除（見学会 _oh_ 含む）
 */

/**
 * GET: シューログ経由で登録されたカレンダーイベント一覧を返却
 */
function doGet() {
  const response = { success: false, events: [], message: '' };
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const now = new Date();
    const searchStart = new Date(now);
    searchStart.setMonth(searchStart.getMonth() - 6);
    const searchEnd = new Date(now);
    searchEnd.setMonth(searchEnd.getMonth() + 6);
    const allEvents = calendar.getEvents(searchStart, searchEnd);
    const systemTag = '[設営管理]';

    for (const event of allEvents) {
      const desc = event.getDescription();
      if (!desc || !desc.includes(systemTag)) continue;
      const idMatch = desc.match(/ID:\s*(.+)$/m);
      response.events.push({
        title: event.getTitle(),
        start: event.getStartTime().toISOString(),
        end: event.getEndTime().toISOString(),
        location: event.getLocation(),
        id: idMatch ? idMatch[1].trim() : '',
        calendarEventId: event.getId()
      });
    }
    response.events.sort((a, b) => new Date(a.start) - new Date(b.start));
    response.success = true;
    response.message = response.events.length + '件のイベントを取得しました';
  } catch (err) {
    response.message = 'エラー: ' + err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

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
          // IDが完全一致するイベントを探す
          if (eventDesc && eventDesc.includes(recordIdInfo)) {
               targetEvent = event;
               isUpdate = true;
               break;
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
