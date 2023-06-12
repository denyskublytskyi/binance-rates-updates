import compose from "lodash/fp/compose";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";
import round from "lodash/round";
import fpMeanBy from "lodash/fp/meanBy";
import fpOrderBy from "lodash/fp/orderBy";
import fpTake from "lodash/fp/take";
import fetch from "node-fetch";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

import eventLogger from "../utils/eventLogger.js";

const dynamoDBClient = new DynamoDBClient({});
const documentClient = new DynamoDBDocumentClient(dynamoDBClient);

const logger = console;

const _handler = async () => {
  const items = [];
  let page = 1;
  let total;

  const fiat = "UAH";
  const asset = "USDT";

  do {
    const response = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          fiat,
          page,
          rows: 20,
          tradeType: "sell",
          asset,
          countries: [],
          proMerchantAds: false,
          publisherType: null,
          payTypes: [],
        }),
      }
    );
    const body = await response.json();
    const { data } = body;
    ({ total } = body);

    items.push(
      ...data.map(({ adv }) => ({
        ...adv,
        price: Number(adv.price),
      }))
    );
    page++;
  } while (items.length < total);

  const rates = {
    top10Mean: compose(
      (n) => round(n, 2),
      fpMeanBy("price"),
      fpTake(10),
      fpOrderBy(["price"], ["desc"])
    )(items),
    mean: compose()((n) => round(n, 2), fpMeanBy("price"))(items),
    max: maxBy(items, "price").price,
    min: minBy(items, "price").price,
    count: items.length,
  };

  logger.info("Rates =>", rates);

  const date = new Date();
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  await documentClient.send(
    new PutCommand({
      TableName: process.env.RATES_TABLE_NAME,
      Item: {
        ...rates,
        asset: "USDT",
        timestamp: +date,
        date: date.toISOString(),
      },
    })
  );

  const text = [
    `Курс P2P *${fiat}/${asset}*W\n`,
    `Середній курc: *${rates.mean}*`,
    `Середній курс серед топ 10 оголошень: *${rates.top10Mean}*`,
    `Максимальний курс: *${rates.max}*`,
    `Мінімальний курс: *${rates.min}*`,
    `Кількість оголошень: *${rates.count}*`,
  ]
    .join("\n")
    .replaceAll(".", "\\.");

  logger.info("Telegram message =>", text);

  const sendMessageResponse = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check in Binance",
                url: `https://p2p.binance.com/en/trade/sell/${asset}?fiat=${fiat}&payment=all-payments`,
              },
            ],
          ],
        },
      }),
    }
  );

  logger.info("Telegram response =>", await sendMessageResponse.json());
};

export const handler = compose(eventLogger)(_handler);
