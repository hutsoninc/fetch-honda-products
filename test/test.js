const fetchHonda = require('../');

test('Fetches all Honda product data', async done => {
    let data;
    try {
        data = await fetchHonda();
    } catch (err) {
        console.error(err);
    }
    expect(data).toBeDefined();
    done();
}, 120000);
