function filterProducts(productUrls, skus) {
    return productUrls.filter(url => {
        for (let i = 0; i < skus.length; i++) {
            let sku = skus[i].toLowerCase();
            if (url.indexOf(`/${sku}/`) !== -1) {
                return true;
            }
        }
        return false;
    });
}

module.exports = filterProducts;