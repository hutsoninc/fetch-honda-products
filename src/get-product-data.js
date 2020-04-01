const { JSDOM } = require('jsdom');
const fetch = require('fetch-retry');
const Bottleneck = require('bottleneck');
const categories = require('./categories');
const multiples = require('./multiples');
const selectorChain = require('./selector-chain');

const limiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 1000 / 9,
});

async function getProductData(productUrls, options) {
    const { url, headers, Promise } = options;

    const baseUrl = url.replace(/\/$/, '');

    const products = [];
    const promises = productUrls.map(productUrl => {
        return limiter.schedule(async () => {
            productUrl = `${baseUrl}${productUrl}`;
            const html = await fetch(productUrl, {
                method: 'GET',
                headers,
            }).then(html => html.text());

            const dom = new JSDOM(html);
            const window = dom.window;
            const { document } = window;

            // Title
            let title = selectorChain(document, [
                '#model-detail .row',
                0,
                'h3',
                0,
            ]);

            if (title) {
                title = title.textContent.trim();
            } else {
                console.error(`No title found ${productUrl}`);
            }

            // Meta Description
            let description = document.querySelector('meta[name=description]');
            if (description) {
                description = description.getAttribute('content');
            }
            if (!description) {
                console.error(`No description found ${productUrl}`);
            }

            // Key Features
            const overview = [];
            const featureItems = selectorChain(document, [
                '#model-detail .row',
                0,
                '.col-sm-6 li',
            ]);
            if (featureItems) {
                featureItems.forEach(e => {
                    const text = e.textContent.replace(/\?/g, '').trim();
                    overview.push(text);
                });
            }
            if (overview.length === 0) {
                console.error(`No overview found ${productUrl}`);
            }

            // SKU and Category
            const splitUrl = productUrl.split('/').filter(s => s);
            const sku = splitUrl.pop().toLowerCase();
            const category = splitUrl.find(part => {
                if (categories.indexOf(part) !== -1) {
                    return part;
                }
            });

            // MSRP
            let msrp = selectorChain(document, [
                '#model-detail .row',
                0,
                '.col-sm-6 h2',
                0,
            ]);
            if (msrp) {
                const msrpText = msrp.nextElementSibling.textContent;
                msrp = msrpText.replace(/[^\d.\/]/g, '');
            }
            if (!msrp) {
                console.error(`No msrp found ${productUrl}`);
            }

            // Images
            const images = [];
            const gallery = document.querySelectorAll('#flexgallery img');
            if (typeof gallery === 'object' && gallery.length !== 0) {
                gallery.forEach(e => {
                    let src = e.getAttribute('src');
                    if (src.charAt(0) === '/') {
                        src = `${baseUrl}${src}`;
                    }

                    src = src.trim();

                    if (
                        images.indexOf(src) === -1 &&
                        /(.(jpg|jpeg|png|gif))/i.test(src)
                    ) {
                        images.push(src);
                    }
                });
            }
            if (images.length === 0) {
                console.error(`No images found ${productUrl}`);
            }

            // Specs
            const specs = [];
            const specTitleEls = document.querySelectorAll('#Specs .spec_left');
            const specTitles = [];
            if (typeof specTitleEls === 'object' && specTitleEls.length !== 0) {
                specTitleEls.forEach(el => {
                    const text = el.textContent;
                    if (text) {
                        specTitles.push(text.trim());
                    }
                });
            }
            const specDetailEls = document.querySelectorAll(
                '#Specs .spec_right'
            );
            const specDetails = [];
            if (
                typeof specDetailEls === 'object' &&
                specDetailEls.length !== 0
            ) {
                specDetailEls.forEach(el => {
                    const text = el.textContent;
                    if (text) {
                        specDetails.push(text.trim());
                    }
                });
            }
            const specTitlesLen = specTitles.length;
            const specDetailsLen = specDetails.length;
            if (specTitlesLen !== specDetailsLen) {
                console.error(`Spec lengths don't match on ${productUrl}`);
            }
            if (specTitlesLen !== 0 && specDetailsLen !== 0) {
                for (let i = 0; i < specTitlesLen; i++) {
                    specs.push({
                        property: specTitles[i],
                        data: specDetails[i],
                    });
                }
            }

            const specsFiltered = specs.filter(obj => obj.data !== '');

            if (specsFiltered.length === 0) {
                console.error(`No specs found ${productUrl}`);
            }

            // Features
            const features = [];
            const featureTitleEls = document.querySelectorAll(
                '#Features .col-lg-4 span'
            );
            const featureTitles = [];
            if (
                typeof featureTitleEls === 'object' &&
                featureTitleEls.length !== 0
            ) {
                featureTitleEls.forEach(el => {
                    const text = el.textContent;
                    if (text) {
                        featureTitles.push(text.replace(/\?/g, '').trim());
                    }
                });
            }
            const featureDetailEls = document.querySelectorAll(
                '#Features .col-lg-4 p'
            );
            const featureDetails = [];
            if (
                typeof featureDetailEls === 'object' &&
                featureDetailEls.length !== 0
            ) {
                featureDetailEls.forEach(el => {
                    const text = el.textContent;
                    if (text) {
                        featureDetails.push(text.trim());
                    }
                });
            }
            const featureImageEls = document.querySelectorAll(
                '#Features .col-lg-2'
            );

            const featureImages = [];
            if (
                typeof featureImageEls === 'object' &&
                featureImageEls.length !== 0
            ) {
                featureImageEls.forEach(el => {
                    if (el) {
                        const featureImage = el.querySelector('img');
                        const featureImageSrc = featureImage
                            ? featureImage.getAttribute('src').trim()
                            : null;
                        featureImages.push(featureImageSrc);
                    }
                });
            }
            const featureTitlesLen = featureTitles.length;
            const featureDetailsLen = featureDetails.length;
            const featureImagesLen = featureImages.length;
            if (
                featureTitlesLen !== featureDetailsLen ||
                featureTitlesLen !== featureImagesLen ||
                featureDetailsLen !== featureImagesLen
            ) {
                console.error(`Feature lengths don't match on ${productUrl}`);
            }
            if (
                featureTitlesLen !== 0 &&
                featureDetailsLen !== 0 &&
                featureImagesLen !== 0
            ) {
                for (let i = 0; i < featureTitlesLen; i++) {
                    const feature = {
                        title: featureTitles[i],
                        text: featureDetails[i],
                    };
                    if (featureImages[i]) {
                        feature.image = featureImages[i];
                    }
                    features.push(feature);
                }
            }

            if (features.length === 0) {
                console.error(`No features found ${productUrl}`);
            }

            // Check if page contains two products
            let multipleFound = false;
            for (let i = 0; i < multiples.length; i++) {
                let match = new RegExp(multiples[i], 'i').exec(title);
                if (match) {
                    multipleFound = true;
                    break;
                }
            }

            const output = [];

            const out = {
                title,
                sku,
                msrp: Number(msrp),
                description,
                overview,
                specs: specsFiltered,
                features,
                images,
                category,
                url: productUrl,
            };

            if (multipleFound) {
                const titles = title.split('/').map(t => t.trim());
                const prices = msrp.split('/');
                const skus = sku.split('-');
                output.push(
                    Object.assign(out, {
                        title: titles[0],
                        msrp: Number(prices[0]),
                        sku: skus[0],
                    })
                );
                output.push(
                    Object.assign(out, {
                        title: titles[1],
                        msrp: Number(prices[1]),
                        sku: skus[1],
                    })
                );
            } else {
                output.push(out);
            }

            products.push(...output);
        });
    });

    await Promise.all(promises);

    return products;
}

module.exports = getProductData;
