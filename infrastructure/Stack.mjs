import path from "path";
import { fileURLToPath } from "url";

import cdk from "aws-cdk-lib/core";
import nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import logs from "aws-cdk-lib/aws-logs";
import events from "aws-cdk-lib/aws-events";
import eventsTargets from "aws-cdk-lib/aws-events-targets";
import dynamodb from "aws-cdk-lib/aws-dynamodb";
import iam from "aws-cdk-lib/aws-iam";
import policyGen from "iam-policy-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Stack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.addGetBinanceRatesLambda();
  }

  addGetBinanceRatesLambda() {
    const ratesTable = new dynamodb.Table(this, "BinanceRates", {
      partitionKey: {
        asset: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        timestamp: dynamodb.AttributeType.NUMBER,
      },
      pointInTimeRecovery: true,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      tableName: "binance-rates",
    });

    const lambda = new nodejsLambda.NodejsFunction(this, "TestLambda", {
      functionName: "get-binance-rates",
      entry: path.join(__dirname, "functions/getBinanceRates/index.mjs"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        RATES_TABLE_NAME: ratesTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    lambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          policyGen.Action.DYNAMODB.PUT_ITEM,
          policyGen.Action.DYNAMODB.GET_ITEM,
        ],
      })
    );

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
