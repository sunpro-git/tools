/**
 * 落語で相続 - Gmail → Firestore 自動取り込みスクリプト
 *
 * LPフォームからの予約メールを5分おきにチェックし、
 * Firestoreに予約として登録 + Chatwork通知を送信する。
 *
 * === セットアップ手順 ===
 * 1. Google Apps Script (https://script.google.com) で新規プロジェクト作成
 * 2. このファイルの内容をコード.gsにコピー
 * 3. スクリプトプロパティに以下を設定:
 *    - FIREBASE_API_KEY: AIzaSyCKLSWXiPgW4Z9HUGCLWZs-Zf6OcB8KDS0
 *    - FIREBASE_PROJECT_ID: rakugo-yoyaku
 *    - CHATWORK_API_TOKEN: 01272590631f16ed47b9789f07d5cf75
 *    - CHATWORK_ROOM_ID: 402525982
 * 4. トリガー設定: checkAndImportEmails を5分おきに実行
 */

// ===== 設定 =====
const TARGET_EMAIL = 'sunpro.chatwork+rakugo260509_matsumoto@gmail.com';

// Firestore REST API base
function getFirestoreBase() {
  const projectId = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

// ===== メイン処理 =====

/**
 * 5分おきトリガーで呼ばれるメイン関数
 */
function checkAndImportEmails() {
  const query = `to:${TARGET_EMAIL} is:unread`;
  const threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    Logger.log('未取り込みメールなし');
    return;
  }

  Logger.log(`${threads.length} 件の未取り込みメールを発見`);

  // 現在の最大受付番号を取得
  let maxNo = getMaxReservationNumber();

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      try {
        const body = message.getPlainBody();
        const parsed = parseReservationEmail(body);

        if (!parsed) {
          Logger.log(`パース失敗: ${message.getSubject()}`);
          continue;
        }

        maxNo++;
        const reservationNo = String(maxNo).padStart(3, '0');

        // Firestoreに書き込み
        writeToFirestore(reservationNo, parsed);

        // Chatwork通知
        sendChatworkNotification(reservationNo, parsed);

        Logger.log(`取り込み成功: #${reservationNo} ${parsed.name}`);
      } catch (e) {
        Logger.log(`エラー: ${e.message}`);
      }
    }

    // 処理済みを既読にする（未読に戻せば再処理される）
    thread.markRead();
  }
}

// ===== メール本文パース =====

function parseReservationEmail(body) {
  function extract(label) {
    // 【ラベル名】に続くテキストを、次の【または罫線まで取得
    const re = new RegExp('【' + escapeRegex(label) + '】([^【]*?)(?=\\n【|【━|$)', 's');
    const m = body.match(re);
    return m ? m[1].trim() : '';
  }

  const name = extract('氏名');
  const furigana = extract('フリガナ');
  const phone = extract('電話番号');
  const postalCode = extract('郵便番号');
  const address = extract('住所');
  const countStr = extract('人数');
  const count = parseInt(countStr, 10) || 0;
  const referralSource = extract('この講演を知ったきっかけ');
  const inheritanceStatus = extract('相続のご状況');

  // お悩み（2パターンのラベルに対応）
  const concernsStr = extract('次の中で、お悩みや関心のあること（複数選択可）')
    || extract('次の中で、お悩みや関心のあること');
  const concerns = concernsStr
    ? concernsStr.split(/[、,]/).map(function(s) { return s.trim(); }).filter(Boolean)
    : [];

  // 無料相談
  const consultationLabel = extract('専門家への無料相談の希望');
  const consultationTypes = {
    '当日の無料相談を希望する（約20分）': 'same_day',
    '後日の無料相談を希望する（ご希望の時間でゆっくり）': 'later',
    'いずれも希望しない': 'none'
  };
  const consultationType = consultationTypes[consultationLabel] || '';

  const consultation = extract('詳しい相談内容・お問合せ内容');

  if (!name && !phone) return null;

  return {
    name: name,
    furigana: furigana,
    phone: phone,
    postalCode: postalCode,
    address: address,
    count: count,
    referralSource: referralSource,
    inheritanceStatus: inheritanceStatus,
    concerns: concerns,
    consultationType: consultationType,
    consultationTypeLabel: consultationLabel,
    consultation: consultation
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== Firestore操作 =====

function getMaxReservationNumber() {
  const base = getFirestoreBase();
  const url = base + '/reservations?pageSize=500&mask.fieldPaths=reservationNo';

  try {
    const res = UrlFetchApp.fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });

    const data = JSON.parse(res.getContentText());
    let maxNum = 0;

    if (data.documents) {
      data.documents.forEach(function(doc) {
        const no = doc.fields && doc.fields.reservationNo && doc.fields.reservationNo.stringValue;
        if (no && /^\d{1,3}$/.test(no)) {
          const num = parseInt(no, 10);
          if (num > maxNum) maxNum = num;
        }
      });
    }

    return maxNum;
  } catch (e) {
    Logger.log('getMaxReservationNumber エラー: ' + e.message);
    return 0;
  }
}

function writeToFirestore(reservationNo, parsed) {
  const base = getFirestoreBase();
  const url = base + '/reservations';

  const now = new Date().toISOString();

  const concernsArray = parsed.concerns.map(function(c) {
    return { stringValue: c };
  });

  const consultationLogs = [];
  if (parsed.consultation) {
    consultationLogs.push({
      mapValue: {
        fields: {
          text: { stringValue: parsed.consultation },
          createdAt: { timestampValue: now }
        }
      }
    });
  }

  const document = {
    fields: {
      reservationNo: { stringValue: reservationNo },
      name: { stringValue: parsed.name },
      furigana: { stringValue: parsed.furigana },
      phone: { stringValue: parsed.phone },
      postalCode: { stringValue: parsed.postalCode },
      address: { stringValue: parsed.address },
      count: { integerValue: parsed.count },
      referralSource: { stringValue: parsed.referralSource },
      inheritanceStatus: { stringValue: parsed.inheritanceStatus },
      concerns: { arrayValue: { values: concernsArray.length > 0 ? concernsArray : [] } },
      concernOther: { stringValue: '' },
      consultationType: { stringValue: parsed.consultationType },
      consultationTypeLabel: { stringValue: parsed.consultationTypeLabel },
      consultation: { stringValue: parsed.consultation },
      consultationLogs: { arrayValue: { values: consultationLogs } },
      wantsReply: { booleanValue: false },
      contactStatus: { stringValue: '' },
      waitlist: { booleanValue: false },
      inquiryOnly: { booleanValue: false },
      status: { stringValue: 'active' },
      history: { arrayValue: { values: [] } },
      source: { stringValue: 'email' },
      createdAt: { timestampValue: now }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(document),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);

  if (res.getResponseCode() !== 200) {
    throw new Error('Firestore書き込み失敗: ' + res.getContentText());
  }
}

// ===== Chatwork通知 =====

/**
 * Chatworkへメッセージを送信（共通関数）
 * @param {string} message - 送信するメッセージ本文
 * @returns {boolean} 送信成功ならtrue
 */
function postToChatwork(message) {
  const props = PropertiesService.getScriptProperties();
  const apiToken = props.getProperty('CHATWORK_API_TOKEN');
  const roomId = props.getProperty('CHATWORK_ROOM_ID');

  if (!apiToken || !roomId) {
    Logger.log('Chatwork設定なし、通知スキップ');
    return false;
  }

  const url = 'https://api.chatwork.com/v2/rooms/' + roomId + '/messages';

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { 'X-ChatWorkToken': apiToken },
      payload: { body: message },
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code >= 200 && code < 300) {
      Logger.log('Chatwork送信成功');
      return true;
    } else {
      Logger.log('Chatwork送信失敗: ' + code + ' ' + res.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log('Chatwork送信エラー: ' + e.message);
    return false;
  }
}

function sendChatworkNotification(reservationNo, parsed) {
  // メッセージ組み立て
  let body = '[info][title]新規予約（WEB受付）[/title]';
  body += '【受付番号】' + reservationNo + '\n';
  body += '【氏名】' + parsed.name + '\n';
  body += '【フリガナ】' + parsed.furigana + '\n';
  body += '【電話番号】' + parsed.phone + '\n';
  if (parsed.address) body += '【住所】' + (parsed.postalCode ? parsed.postalCode + ' ' : '') + parsed.address + '\n';
  if (parsed.count > 0) body += '【人数】' + parsed.count + '名\n';
  if (parsed.referralSource) body += '【きっかけ】' + parsed.referralSource + '\n';
  if (parsed.inheritanceStatus) body += '【相続の状況】' + parsed.inheritanceStatus + '\n';
  if (parsed.concerns.length > 0) body += '【お悩み】' + parsed.concerns.join('、') + '\n';
  if (parsed.consultationTypeLabel) body += '【無料相談】' + parsed.consultationTypeLabel + '\n';
  if (parsed.consultation) body += '【相談内容】' + parsed.consultation + '\n';
  body += '[/info]';

  postToChatwork(body);
  Logger.log('Chatwork通知送信完了: #' + reservationNo);
}

// ===== Web API: フロントエンドからChatwork通知を受け取る =====

/**
 * フロントエンドからPOSTで呼ばれる
 * Body: { message: string }
 * Response: { success: boolean, error?: string }
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.message || typeof data.message !== 'string') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'message is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ok = postToChatwork(data.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: ok }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET（確認用）
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', name: 'rakugo-yoyaku gmail-to-firestore' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== トリガー設定用 =====

/**
 * 5分おきのトリガーを設定する（初回のみ手動実行）
 */
function setupTrigger() {
  // 既存トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'checkAndImportEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 5分おきトリガーを作成
  ScriptApp.newTrigger('checkAndImportEmails')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('5分おきトリガーを設定しました');
}

/**
 * テスト用: 手動実行して動作確認
 */
function testParse() {
  const sampleBody = `
【━━━━━━━━━━━━━━━━━━━━━━━━━━━━━】

【氏名】テスト太郎
【フリガナ】テストタロウ
【電話番号】090-1234-5678
【メールアドレス】test@example.com
【人数】3
【この講演を知ったきっかけ】チラシ、ホームページ
【相続のご状況】近い将来発生するかもしれない
【次の中で、お悩みや関心のあること（複数選択可）】相続の基本的な手続き、家や土地をどうするか
【専門家への無料相談の希望】後日の無料相談を希望する（ご希望の時間でゆっくり）
【詳しい相談内容・お問合せ内容】テストです

【━━━━━━━━━━━━━━━━━━━━━━━━━━━━━】
`;

  const result = parseReservationEmail(sampleBody);
  Logger.log(JSON.stringify(result, null, 2));
}
