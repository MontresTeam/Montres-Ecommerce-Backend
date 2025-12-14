const express = require('express');
const axios = require('axios');
const router = express.Router();
const TABBY_SECRET = process.env.TABBY_SECRET;
const MERCHANT_CODE = process.env.TABBY_MERCHANT_CODE || 'MTAE';

router.post('/create-tabby-checkout', async (req, res) => {
try {
const { amount, currency = 'AED', customer = {}, order = {} } = req.body;
const payload = {
payment: {
amount: amount,
currency: currency,
description: `Order #${order.id || 'N/A'}`
},
merchant_code: MERCHANT_CODE,
buyer: customer.buyer || {},
shipping_address: customer.shipping || {},
order: order.items || [],
lang: 'en'
};
const response = await axios.post('https://api.tabby.ai/api/v2/checkout', payload, {
headers: {
Authorization: `Bearer ${TABBY_SECRET}`,
'Content-Type': 'application/json'
}
});
// This path may vary; inspect Tabby response object in sandbox
const webUrl =
response.data?.configuration?.available_products?.installments?.web_url;
return res.json({ checkout_url: webUrl, raw: response.data });
} catch (err) {
console.error(err?.response?.data || err.message);
return res.status(500).json({ error: err?.response?.data ||
err.message });
}
});
        
router.post('/tabby-webhook', (req, res) => {
const event = req.body;
console.log('Webhook received:', JSON.stringify(event).slice(0, 1000));
// TODO: verify signature if Tabby provides one
// Example: if event.event_type === 'INSTALLMENT_CREATED' etc.
res.status(200).send('ok');
});
module.exports = router;