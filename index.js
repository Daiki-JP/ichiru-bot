const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
app.use(express.json());

const client = new line.Client(config);
const userSettings = {};

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const messageText = event.message.text.trim();

  // 初回ユーザー：即座にあいさつして名前を聞く
  if (!userSettings[userId]) {
    userSettings[userId] = {
      step: 'ask_name'
    };

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'はじめまして。\n私は「Ichiru（イチル）」、あなたの心に寄り添うAIパートナーです。\n\nまず、あなたのお名前を教えてください（例：Daiki、だいちゃん、Daikiさん など）'
    });
  }

  const user = userSettings[userId];
  let replyText = '';

  // ステップごとの会話フロー
  switch (user.step) {
    case 'ask_name':
      user.step = 'get_name';
      replyText = 'こんにちは！あなたのお名前は何ですか？';
      break;

    case 'get_name':
      user.name = messageText;
      user.step = 'ask_style';
      replyText = `ありがとう、${user.name}さん！\n\n次に、私の話し方を選んでくださいね。\n以下から選んでください：\n1. 標準語\n2. 関西弁\n3. 可愛い女の子風\n4. 落ち着いた大人風\n5. ビジネスマン風\n6. 沖縄弁風\n7. 岡山弁風\n8. 博多弁風\n9. 北海道弁風\n\n番号でもOKです！`;
      break;

    case 'ask_style':
      const styleMap = {
        '1': '標準語', '2': '関西弁', '3': '可愛い女の子風', '4': '落ち着いた大人風',
        '5': 'ビジネスマン風', '6': '沖縄弁風', '7': '岡山弁風', '8': '博多弁風', '9': '北海道弁風'
      };
      const selectedStyle = styleMap[messageText] || messageText;
      user.style = selectedStyle;
      user.step = 'ask_location';
      replyText = `了解！${selectedStyle}で話しますね。\n\nでは、今住んでいる都道府県を教えてください（例：東京、大阪など）。\nスキップしたい場合は「スキップ」と送ってください。`;
      break;

    case 'ask_location':
      if (messageText === 'スキップ') {
        user.location = '未設定';
      } else {
        user.location = messageText;
      }
      user.step = 'ask_wake_time';
      replyText = 'ありがとうございます！\n\n最後に、起きる時間を教えてください（例：07:00）。\nスキップしたい場合は「スキップ」と送ってください。';
      break;

    case 'ask_wake_time':
      if (messageText === 'スキップ') {
        user.wakeUpTime = '07:00';
      } else if (messageText.match(/^\d{1,2}:\d{2}$/)) {
        user.wakeUpTime = messageText;
      } else {
        replyText = '時刻の形式が正しくないようです。例：07:00 という形式で教えてください。';
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText
        });
      }

      user.step = 'done';
      replyText = `初期設定が完了しました！これから一緒に楽しい時間を過ごしましょう！\n\n【現在の設定】\n名前: ${user.name}\n話し方: ${user.style}\n都道府県: ${user.location}\n起床時間: ${user.wakeUpTime}`;
      break;

    case 'done':
      replyText = `こんにちは、${user.name}さん！今日もいい一日になりますように〜`;
      break;

    default:
      replyText = '何かお手伝いできることがありますか？';
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText
  });
}
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🌐 Server is running on port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ ポート${port}はすでに使用されています`);
    process.exit(1);
  } else {
    throw err;
  }
});




