const cheerio = require('cheerio');
const fetch = require('fetch-retry');
const Bottleneck = require('bottleneck');
const categories = require('./categories');
const multiples = require('./multiples');

const limiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 1000 / 9,
});

async function fetchProductSubcategories(options) {
    let { url, headers, Promise } = options;

    let cats = Object.keys(categories);
    let subcategories = {};

    let promises = [];
    for (let i = 0; i < cats.length; i++) {
        let cat = cats[i]
        let subCats = categories[cats[i]];
        for (let j = 0; j < subCats.length; j++) {
            let subCat = subCats[j];
            let path = `/${cat}/${subCat}`;
            promises.push(limiter.schedule(async () => {
                let fetchUrl = `${url}${path}`;
                let html = await fetch(fetchUrl, {
                    method: 'GET',
                    headers,
                });
                html = await html.text();

                const $ = cheerio.load(html);

                // Remove footer links
                $('.footer-links').remove();
                $('#footer').remove();

                let skus = [];

                // Can't get it to work with more specific selectors...
                // Need to look into a better way of doing this
                $('a').each((i, e) => {
                    let url = e.attribs.href.trim();
                    // Check if product url
                    if (url.indexOf('models') >= 0) {
                        let sku = url.split('/').pop();

                        // Check if page contains two products
                        let found = false;
                        for (let k = 0; k < multiples.length; k++) {
                            let match = new RegExp(multiples[k], 'i').exec(sku);
                            if (match) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            sku = sku.split('-');
                            skus = skus.concat(sku)
                        } else {
                            // Check if sku is already in skus array
                            if (skus.indexOf(sku) === -1) {
                                skus.push(sku);
                            }
                        }
                    }
                });

                subcategories[subCat] = skus;

            }));
        }
    }

    await Promise.all(promises);

    return subcategories;
}

module.exports = fetchProductSubcategories;