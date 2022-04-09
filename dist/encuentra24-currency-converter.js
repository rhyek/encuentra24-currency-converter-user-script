"use strict";
// ==UserScript==
// @name         Encuentra24 Currency Converter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.encuentra24.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @run-at document-start
// ==/UserScript==
let gtqRatePromise = fetch(
  "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.min.json"
)
  .then((response) => response.json())
  .then((json) => json.usd.gtq);
async function processListings() {
  const gtqRate = await gtqRatePromise;
  console.log(gtqRate);
  const articles = document.querySelectorAll("article");
  for (const article of Array.from(articles)) {
    const priceEl = article.querySelector("[itemprop=price]");
    if (!priceEl) {
      continue;
    }
    const originalPriceStr = priceEl.textContent;
    if (!originalPriceStr) {
      continue;
    }
    const [, priceStr] = originalPriceStr.split("Q");
    if (priceStr) {
      // it was Q, not $
      const priceGtq = Number(priceStr.replaceAll(",", ""));
      const priceUsd = priceGtq / gtqRate;
      const priceUsdStr = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(priceUsd);
      priceEl.innerHTML = `🔄 ${priceUsdStr}`;
      priceEl.title = originalPriceStr;
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  // need @run-at
  processListings();
  new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length < mutation.addedNodes.length) {
        processListings();
      }
    }
  }).observe(document.querySelector("#currentlistings"), {
    childList: true,
    subtree: false,
  });
});
