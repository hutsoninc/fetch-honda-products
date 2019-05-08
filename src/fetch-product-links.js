const fetch = require('fetch-retry');
const { JSDOM } = require('jsdom');
const categories = require('./categories');

async function fetchProductLinks(options) {
    let { url, headers, Promise } = options;
    let categoryKeys = Object.keys(categories);
    let promises = [];
    for (let i = 0, len = categoryKeys.length; i < len; i++) {
        promises.push(doFetch(`${url}${categoryKeys[i]}`, headers));
    }
    let links = [];
    let linkArrs = await Promise.all(promises);
    linkArrs.forEach(arr => {
        links = links.concat(arr);
    })
    return links;
}

async function doFetch(url, headers) {
    try {
        let html = await fetch(url, {
            method: 'GET',
            headers
        });
        html = await html.text();

        let dom = new JSDOM(html);
        let window = dom.window;
        let { document } = window;

        let urls = [];

        document.querySelectorAll('#main a').forEach(e => {
            let url = e.href.trim();
            // Check if product url
            if (url.indexOf('models') >= 0) {
                if (!/\/$/.test(url)) {
                    url += '/';
                }
                // Check if url is already in urls array
                if (urls.indexOf(url) === -1) {
                    urls.push(url);
                }
            }
        });
        return urls;
    } catch (err) {
        console.error(err);
    }
}

module.exports = fetchProductLinks;