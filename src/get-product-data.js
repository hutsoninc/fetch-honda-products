const { JSDOM } = require('jsdom');
const fetch = require('fetch-retry');
const Bottleneck = require('bottleneck');
const categories = require('./categories');
const fetchProductSubcategories = require('./fetch-product-subcategories');
const multiples = require('./multiples');

const limiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 1000 / 9,
});

async function getProductData(productUrls, options) {
    let { url, headers, Promise } = options;

    url = url.replace(/\/$/, '');

    let categoryKeys = Object.keys(categories);

    // Get SKUs for each subcategory
    let productSubcategories = await fetchProductSubcategories(options);
    let subcategoryKeys = Object.keys(productSubcategories);

    let products = [];
    let promises = productUrls.map(productUrl => {
        return limiter.schedule(async () => {
            productUrl = `${url}${productUrl}`;
            let html = await fetch(productUrl, {
                method: 'GET',
                headers,
            });
            html = await html.text();

            let dom = new JSDOM(html);
            let window = dom.window;
            let { document } = window;

            // Title
            let title = document.querySelector('.summary h1') || document.querySelector('#model-name h1');
            title = title.textContent.trim();

            // Meta Description
            let description = document.querySelector('meta[name=description]').getAttribute('content');

            // Key Features
            let overview = []
            let featureItems = document.querySelectorAll('.disc li');
            if (featureItems) {
                featureItems.forEach(e => {
                    let text = e.textContent.trim();
                    overview.push(text);
                });
            }

            // SKU and Category
            let splitUrl = productUrl.split('/').filter(s => s);
            let sku = splitUrl.pop().toLowerCase();
            let category;
            splitUrl.forEach(part => {
                if (categoryKeys.indexOf(part) !== -1) {
                    category = part;
                }
            });

            // MSRP
            let msrp = document.querySelector('.msrp h5').textContent;
            msrp = msrp.replace(/[^\d.\/]/g, '');

            // Images
            let images = [];
            let gallery = document.querySelector('.gallery') || document.querySelector('#Gallery');
            if (gallery) {
                gallery.querySelectorAll('a').forEach(e => {
                    let src = e.getAttribute('href');
                    let img = `${url}${src}`.trim();
                    if (images.indexOf(img) === -1) {
                        images.push(img);
                    }
                });

                images = images.filter(i => /(.(jpg|jpeg|png|gif))/i.test(i));
            }

            // Specs
            let specs = [];
            let specRows = document.querySelectorAll('.additional-specs tbody tr');
            if (specRows) {
                specRows.forEach(e => {
                    let spec = {};
                    let tds = e.querySelectorAll('td');
                    tds.forEach((e, i) => {
                        let text = e.textContent.trim();
                        if (i === 0) {
                            spec.property = text;
                        } else {
                            spec.data = text;
                        }
                    });
                    specs.push(spec);
                });
            }

            specs = specs.filter(obj => obj.data !== '');

            // Check if page contains two products
            let multipleFound = false;
            for (let i = 0; i < multiples.length; i++) {
                let match = new RegExp(multiples[i], 'i').exec(title);
                if (match) {
                    multipleFound = true;
                    break;
                }
            }

            let output = [];

            let out = {
                title,
                sku,
                msrp: Number(msrp),
                description,
                overview,
                specs,
                images,
                category,
                url: productUrl,
            }

            if (multipleFound) {
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

            // Subcategory
            output = output.map(obj => {
                let subcategories = [];
                for (let i = 0; i < subcategoryKeys.length; i++) {
                    let skus = productSubcategories[subcategoryKeys[i]];
                    if (skus.indexOf(obj.sku) !== -1) {
                        subcategories.push(subcategoryKeys[i]);
                    }
                }
                return {
                    ...obj,
                    subcategories,
                }
            })

            products = products.concat(output);
        });
    });

    await Promise.all(promises);

    return products;
}

module.exports = getProductData;