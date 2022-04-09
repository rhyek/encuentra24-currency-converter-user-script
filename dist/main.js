"use strict";
// https://stackoverflow.com/questions/49509874/how-can-i-develop-my-userscript-in-my-favourite-ide-and-avoid-copy-pasting-it-to
let gtqRatePromise = fetch(
  "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.min.json"
)
  .then((response) => response.json())
  .then((json) => {
    const rate = json.usd.gtq;
    console.log(`gtq rate: ${rate}`);
    return rate;
  });
async function processElement(element) {
  const gtqRate = await gtqRatePromise;
  if (!element) {
    return;
  }
  for (const child of Array.from(element.childNodes)) {
    if (child instanceof Text && child.data.trim()) {
      const originalPriceStr = child.data.trim();
      if (!originalPriceStr) {
        continue;
      }
      const match = originalPriceStr.match(
        /^Q(?<value>[0-9,]+)(?<reduced> \(Reduced .+\))?$/
      );
      if (!match) {
        continue;
      }
      const { value, reduced } = match.groups;
      const priceGtq = Number(value.replaceAll(",", ""));
      const priceUsd = priceGtq / gtqRate;
      const priceUsdStr = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(priceUsd);
      child.data = `🔄 ${priceUsdStr}${reduced ?? ""}`;
      element.title = originalPriceStr;
      break;
    }
  }
}
async function processListings() {
  const articles = document.querySelectorAll("article");
  await Promise.all(
    Array.from(articles).map(async (article) => {
      const mortgageEl = article.querySelector(".ann-info-funding-list");
      if (mortgageEl) {
        mortgageEl.remove();
      }
      const priceEl = article.querySelector("[itemprop=price]");
      await processElement(priceEl);
    })
  );
}
async function processRelated() {
  const prices = document.querySelectorAll(".ann-box-teaser .price");
  await Promise.all(
    Array.from(prices).map((priceEl) => processElement(priceEl))
  );
}
// need @run-at
document.addEventListener("DOMContentLoaded", () => {
  processListings();
  processElement(document.querySelector(".offer-price"));
  processRelated();
  const currentListings = document.querySelector("#currentlistings");
  if (currentListings) {
    new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.removedNodes.length < mutation.addedNodes.length) {
          processListings();
          break;
        }
      }
    }).observe(currentListings, {
      childList: true,
      subtree: false,
    });
  }
  const moreBox = document.querySelector(".more-box");
  if (moreBox) {
    new MutationObserver(() => {
      processRelated();
    }).observe(moreBox, {
      childList: true,
      subtree: true,
    });
  }
});
