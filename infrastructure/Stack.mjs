import path from "path";
import { fileURLToPath } from "url";

import cdk from "aws-cdk-lib/core";
import nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import logs from "aws-cdk-lib/aws-logs";
import events from "aws-cdk-lib/aws-events";
import eventsTargets from "aws-cdk-lib/aws-events-targets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Stack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.addGetBinanceRatesLambda();
  }

  addGetBinanceRatesLambda() {
    const lambda = new nodejsLambda.NodejsFunction(this, "TestLambda", {
      functionName: "get-binance-rates",
      entry: path.join(__dirname, "functions/getBinanceRates/index.mjs"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const rule = new events.Rule(this, "GetBinanceRatesRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "*/1",
      }),
    });

    rule.addTarget(new eventsTargets.LambdaFunction(lambda));
  }
}

export default Stack;
