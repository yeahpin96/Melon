"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const { IncomingWebhook } = require("@slack/webhook");
const axios = require("axios").default || require("axios");
const qs = require("querystring");

(async () => {
  // --- Required inputs ---
  const [productId, scheduleId, webhookUrl] = [
    "product-id",
    "schedule-id",
    "slack-incoming-webhook-url",
  ].map((name) => {
    const value = core.getInput(name);
    if (!value) {
      throw new Error(`melon-ticket-actions: Please set ${name} input parameter`);
    }
    return value;
  });

  // --- Either block-id or seat-id must be provided (block-id takes precedence) ---
  const blockId = core.getInput("block-id");
  const seatId = core.getInput("seat-id");
  if (!blockId && !seatId) {
    throw new Error("melon-ticket-actions: Please set 'block-id' or 'seat-id' input parameter");
  }
  if (blockId && seatId) {
    core.warning("Both 'block-id' and 'seat-id' were provided. 'block-id' will take precedence.");
  }
  const id = blockId || seatId;

  const message = core.getInput("message") ?? "티켓사세요";
  const webhook = new IncomingWebhook(webhookUrl);

  const res = await axios({
    method: "POST",
    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
    params: { v: "1" },
    data: qs.stringify({
      prodId: productId,
      scheduleNo: scheduleId,
      seatId: id,                   // ← 統一用 id；若是 block-id 也會傳這個值
      volume: 1,
      selectedGradeVolume: 1,
    }),
  });

  // tslint:disable-next-line
  console.log("Got response: ", res.data);

  if (res.data.chkResult) {
    const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({
      prodId: productId,
    })}`;
    await webhook.send(`${message} ${link}`);
  }
})().catch((e) => {
  console.error(e.stack); // tslint:disable-line
  core.setFailed(e.message);
});
