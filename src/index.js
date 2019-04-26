const fetchProductLinks = require('./fetch-product-links');
const filterProducts = require('./filter-products');
const getProductData = require('./get-product-data');
const Promise = require('bluebird');
const removeDuplicates = require('./remove-duplicates');

const defaultOptions = {
    url: 'https://powerequipment.honda.com/',
    headers: {},
    Promise
};

/**
 * 
 * @param {Array} skus Product SKUs to keep
 * @param {Object} options Options
 */

async function fetchProducts(skus, options = {}) {
    // If first argument is an object, use as options
    if (skus && typeof skus === 'object' && !Array.isArray(skus)) {
        options = Object.assign(defaultOptions, skus);
    } else {
        options = Object.assign(defaultOptions, options);
    }

    // Append / to URL
    if (options.url.charAt(options.url.length - 1) !== '/') {
        options.url = options.url + '/';
    }

    // Get all product URLs
    let productUrls = await fetchProductLinks(options);

    // Filter products
    if (skus) {
        productUrls = filterProducts(productUrls, skus);
    }

    // Get data
    let data = await getProductData(productUrls, options);
    
    // Remove any duplicate products that slipped through
    data = removeDuplicates(data);
    
    return data;
}

module.exports = fetchProducts;