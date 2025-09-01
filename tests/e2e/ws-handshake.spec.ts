import { test, expect } from "@playwright/test";

test("ws handshake works", async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  const result = await page.evaluate(async () => {
    const url = (location.origin.replace(/^http/, "ws")) + "/ws?token=dummy";
    const ws = new WebSocket(url);
    return await new Promise<string>((resolve, reject) => {
      const t = setTimeout(()=>reject(new Error("timeout")), 5000);
      ws.addEventListener("open", () => { clearTimeout(t); resolve("connected"); });
      ws.addEventListener("message", (ev) => { clearTimeout(t); resolve(String(ev.data)); });
      ws.addEventListener("error", (err) => { clearTimeout(t); reject(err); });
      ws.addEventListener("close", (ev) => { clearTimeout(t); resolve(`closed: ${ev.code}`); });
    });
  });
  expect(result).toBeTruthy();
});