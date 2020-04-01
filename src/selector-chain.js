const selectorChain = (baseEl, selectArr, fallback = null) => {
    const len = selectArr.length;

    let currentEl = baseEl;

    for (let i = 0; i < len; i++) {
        let newEl;
        const selectType = typeof selectArr[i];
        if (selectType === 'string') {
            if (Array.isArray(selectArr[i])) {
                newEl = currentEl[0];
            }
            newEl = currentEl.querySelectorAll(selectArr[i]);
        } else if (
            selectType === 'number' &&
            typeof currentEl === 'object' &&
            currentEl.length !== 0
        ) {
            newEl = currentEl[selectArr[i]];
        }

        if (newEl) {
            currentEl = newEl;
        } else {
            currentEl = fallback;
            break;
        }
    }

    return currentEl;
};

module.exports = selectorChain;
