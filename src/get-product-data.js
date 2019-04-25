const cheerio = require('cheerio');
const fetch = require('fetch-retry');
const categories = require('./categories');
const Bottleneck = require('bottleneck')

const limiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 1000 / 9,
})

const multiples = [
    'HSS724AT',
    'HSS724ATD',
    'HSS724AW',
    'HSS724AWD',
    'HSS928AW',
    'HSS928AWD',
    'HSS1332AT',
    'HSS1332ATD',
    'HSS928AT',
    'HSS928ATD',
];

async function getProductData(productUrls, options) {
    let { url, headers, Promise } = options;
    let products = [];
    let promises = productUrls.map(productUrl => {
        return limiter.schedule(async () => {
            productUrl = `${url}${productUrl}`;
            let html = await fetch(productUrl, {
                method: 'GET',
                headers,
            });
            html = await html.text();

            const $ = cheerio.load(html);

            // Title
            let title = $('.summary h1').text() || $('#model-name h1').text();
            title = title.trim();

            // Meta Description
            let description = $('meta[name=description]')[0].attribs.content;

            // Key Features
            let overview = []
            $('.disc li').each((i, e) => {
                let text = cheerio.load(e).text().trim();
                overview.push(text);
            });

            // SKU and Category
            let splitUrl = productUrl.split('/').filter(s => s);
            let sku = splitUrl.pop().toLowerCase();
            let category;
            splitUrl.forEach(part => {
                if (categories.indexOf(part) !== -1) {
                    category = part;
                }
            });

            // MSRP
            let msrp = $('.msrp h5').text();
            msrp = msrp.replace(/[^\d.\/]/g, '');
            // msrp = Number(msrp);

            // Images
            let images = [];
            $('.image a.image').each((i, e) => {
                let src = e.attribs.href;
                images.push(url.slice(0, -1) + src);
            });

            // Specs
            let specs = [];
            $('.additional-specs tbody tr').map((i, el) => {
                el = cheerio.load(el);
                let spec = {};
                el('td').map((i, e) => {
                    let text = cheerio.load(e).text().trim();
                    if (i === 0) {
                        spec.property = text;
                    } else {
                        spec.data = text;
                    }
                });
                specs.push(spec);
            });

            specs = specs.filter(obj => obj.data !== '');

            // Check if page contains two products
            let found = false;
            for (let i = 0; i < multiples.length; i++) {
                let match = new RegExp(multiples[i], 'i').exec(title);
                if (match) {
                    found = true;
                    break;
                }
            }

            let output = [];

            let out = {
                title,
                msrp: Number(msrp),
                description,
                overview,
                specs,
                images,
                category,
                url: productUrl,
            }

            if (found) {
                let titles = title.split('/').map(t => t.trim());
                let prices = msrp.split('/');
                let skus = sku.split('-');
                output.push(Object.assign(out, {
                    title: titles[0],
                    msrp: Number(prices[0]),
                    sku: skus[0],
                }));
                output.push(Object.assign(out, {
                    title: titles[1],
                    msrp: Number(prices[1]),
                    sku: skus[1],
                }));
            } else {
                output.push(out);
            }

            products = products.concat(output);
        });
    });

    await Promise.all(promises);

    return products;
}

module.exports = getProductData;