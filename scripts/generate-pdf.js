import { chromium } from "playwright";

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:4321/?pdf=1", { waitUntil: "networkidle" });

  await page.emulateMedia({ media: "print" });

  await page.pdf({
    path: "public/Timofei-Seriakov-CV.pdf",
    margin: { top: "50px", right: "56px", bottom: "80px", left: "56px" },
    printBackground: true,
  });

  return browser.close();
};

main();
