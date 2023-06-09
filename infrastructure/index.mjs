import { App } from "aws-cdk-lib";
import Stack from "./Stack.mjs";

const app = new App();
new Stack(app, "BinanceRatesUpdates", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
