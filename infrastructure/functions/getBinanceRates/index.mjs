import compose from "lodash/fp/compose";
import meanBy from "lodash/meanBy";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";
import round from "lodash/round";
import fetch from "node-fetch";

import eventLogger from "../utils/eventLogger.js";

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
    mean: round(meanBy(items, "price"), 2),
    max: maxBy(items, "price").price,
    min: minBy(items, "price").price,
    count: items.length,
  };

  logger.info("Rates =>", rates);

  const text = [
    `Курс P2P *${fiat}/${asset}*W\n`,
    `Середній курc: *${rates.mean}*`,
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
