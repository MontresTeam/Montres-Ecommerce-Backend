require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/OrderModel'); // Adjust path to Order model if needed

// ✅ 1. Pre-Scoring
const preScoring = async (req, res) => {
  try {
    const { amount, currency, buyer, shipping_address } = req.body;
    
    // Call Tabby pre-scoring API
    const response = await axios.post(
      'https://api.tabby.ai/api/v2/pre_scoring',
      {
        amount,
        currency,
        buyer,
        shipping_address,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TABBY_SECRET_KEY}`, // Use SECRET key
          'Content-Type': 'application/json',
        }
      }
    );
    
    res.json({ 
      eligible: response.data.status === 'approved',
      details: response.data 
    });
  } catch (error) {
    console.error('Tabby pre-scoring error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Pre-scoring failed',
      eligible: false 
    });
  }
};

// ✅ 2. Create Session
const createSession = async (req, res) => {
    try {
      console.log(req.body,'hello');  
      const { payment, merchant_code, lang, merchant_urls } = req.body;
      
      if (!payment || !payment.order) {
           return res.status(400).json({ success: false, message: "Invalid payment data" });
      }

      // Map Tabby items to OrderModel items
      const mappedItems = payment.order.items.map(item => ({
          name: item.title,
          price: item.unit_price,
          quantity: item.quantity,
          // productId: item.reference_id // Optional: if you pass ID in reference_id
      }));

      const orderData = {
        orderId: payment.order.reference_id,
        items: mappedItems,
        total: payment.amount, // Correct field name
        currency: payment.currency,
        shippingFee: 0, // Default or extract if available
        paymentMethod: 'tabby', // Correct enum
        paymentStatus: 'pending',
        orderStatus: 'Pending',
        shippingAddress: payment.buyer ? { // Simple mapping check, might need detail
            firstName: payment.buyer.name,
            email: payment.buyer.email,
            phone: payment.buyer.phone
        } : {}
      };

      const order = await Order.create(orderData);
      
      const response = await axios.post(
        'https://api.tabby.ai/api/v2/checkout',
        {
          payment,
          merchant_code,
          lang,
          merchant_urls
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.TABBY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Save Tabby session ID
      order.tabbySessionId = response.data.id;
      await order.save();
      
      res.json({
        success: true,
        checkoutUrl: response.data.configuration.available_products[0]?.web_url,
        sessionId: response.data.id
      });
    } catch (error) {
      console.error('Tabby session creation error:', error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        message: error.response?.data?.message || 'Failed to create Tabby session' 
      });
    }
  };

// ✅ 3. Webhook Handler
const handleWebhook = async (req, res) => {
    try {
      const signature = req.headers['tabby-signature'];
      const payload = req.body;
      
      if (process.env.TABBY_WEBHOOK_SECRET) {
          const expectedSignature = crypto
            .createHmac('sha256', process.env.TABBY_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');
          
          if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
      }
      
      if (payload.event === 'payment.authorized') {
        const paymentId = payload.payload.id;
        
        const paymentResponse = await axios.get(
          `https://api.tabby.ai/api/v2/payments/${paymentId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TABBY_SECRET_KEY}`
            }
          }
        );
        
        if (paymentResponse.data.status === 'AUTHORIZED') {
          await axios.post(
            `https://api.tabby.ai/api/v2/payments/${paymentId}/captures`,
            {
              amount: paymentResponse.data.amount.amount,
              reference_id: `CAPTURE-${Date.now()}`,
              items: paymentResponse.data.order.items
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.TABBY_SECRET_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const orderReference = paymentResponse.data.order.reference_id;
          
          await Order.findOneAndUpdate(
            { orderId: orderReference },
            { 
              paymentStatus: 'paid', // Update payment status
              orderStatus: 'Processing', // Update order workflow status
              // tabbyPaymentId: paymentId // If you add this field to schema later
            }
          );
          
          console.log(`Payment captured for order: ${orderReference}`);
        }
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };

module.exports = {
    preScoring,
    createSession,
    handleWebhook
};
