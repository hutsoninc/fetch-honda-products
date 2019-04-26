function removeDuplicates(data) {
    let output = [data[0]];

    data.forEach(obj => {
        if (output.findIndex(o => o.sku === obj.sku) === -1) {
            output.push(obj);
        }
    });

    return output;
}

module.exports = removeDuplicates;