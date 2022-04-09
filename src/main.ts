// https://stackoverflow.com/questions/49509874/how-can-i-develop-my-userscript-in-my-favourite-ide-and-avoid-copy-pasting-it-to

let _rates: Record<string, number> | null = null;
async function getRates() {
  if (!_rates) {
    _rates = await fetch(
      'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.min.json'
    )
      .then((response) => response.json())
      .then((json) => {
        return json.usd as Record<string, number>;
      });
  }
  return _rates!;
}

const currencySymbolMap: Record<string, string> = {
  Q: 'gtq',
  '₡': 'crc',
};

async function processElement(element: HTMLElement | null) {
  const rates = await getRates();
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
        /^(?<currency>[^0-9,.]+)(?<amount>[0-9,.]+)(?<reduced> \(Reduced .+\))?$/
      );
      if (!match) {
        continue;
      }
      const { currency: currencySymbol, amount, reduced } = match.groups!;
      const currency = currencySymbolMap[currencySymbol];
      if (typeof currency === 'undefined') {
        break;
      }
      const priceOther = Number(amount.replaceAll(',', ''));
      const priceUsd = priceOther / rates[currency];
      const priceUsdStr = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(priceUsd);
      child.data = `🔄 ${priceUsdStr}${reduced ?? ''}`;
      element.title = originalPriceStr;
      break;
    }
  }
}

async function processListings() {
  const articles = document.querySelectorAll('article');
  await Promise.all(
    Array.from(articles).map(async (article) => {
      const mortgageEl = article.querySelector<HTMLSpanElement>(
        '.ann-info-funding-list'
      );
      if (mortgageEl) {
        mortgageEl.remove();
      }
      const priceEl = article.querySelector<HTMLDivElement>('[itemprop=price]');
      await processElement(priceEl);
    })
  );
}

async function processBySelector(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  await Promise.all(
    Array.from(elements).map((element) => processElement(element))
  );
}

async function processRelated() {
  await processBySelector('.ann-box-teaser .price');
}

// need @run-at
document.addEventListener('DOMContentLoaded', () => {
  processListings();
  processElement(document.querySelector('.offer-price'));
  // related
  processRelated();
  // last visited
  processBySelector('.last-visited-ads .ann-price');

  const currentListings = document.querySelector('#currentlistings');
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

  const moreBox = document.querySelector('.more-box');
  if (moreBox) {
    new MutationObserver(() => {
      processRelated();
    }).observe(moreBox, {
      childList: true,
      subtree: true,
    });
  }
});
