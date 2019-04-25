const fetch = require('fetch-retry');
const cheerio = require('cheerio');

async function fetchProductLinks(options) {
    let { url, headers, categories, Promise } = options;
    let promises = [];
    for (let i = 0, len = categories.length; i < len; i++) {
        promises.push(doFetch(`${url}${categories[i]}`, headers));
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
        const $ = cheerio.load(html);
        let urls = [];
        // Can't get it to work with more specific selectors...
        // Need to look into a better way of doing this
        $('a').each((i, e) => {
            let url = e.attribs.href.trim();
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