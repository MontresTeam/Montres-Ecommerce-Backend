// customerio.js
const { Analytics } = require('@customerio/cdp-analytics-node');

const analytics = new Analytics({
  writeKey: 'b0ae1ef766002777b264', // your key
  host: 'https://cdp.customer.io',
});

module.exports = analytics;
