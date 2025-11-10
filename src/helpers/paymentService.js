// This file represents what would be implemented on your backend server
// For security reasons, the secret key should never be exposed on the frontend

/*
// This would be on your backend server (Node.js example)
const stripe = require('stripe')('sk_test_51SPeGEIRSp1WkXTfRteFo2CR3wAPNLf7vO8YnAH5iOZYqbmSCwuNh2KvVLnU542rbaaqYen17CeqFDeQllfTEJpO00xGdFVrSz');

const createCheckoutSession = async (planType) => {
  try {
    // Determine product ID and price based on plan type
    let productId, price;
    if (planType === 'personal') {
      productId = 'prod_TMNGgFTylzb8QW';
      price = 29900; // $299 in cents
    } else if (planType === 'business') {
      productId = 'prod_TMNNYQxN91G5Ki';
      price = 19900; // $199 in cents
    } else {
      throw new Error('Invalid plan type');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: productId,
            unit_amount: price,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'http://localhost:3000/dashboard',
      cancel_url: 'http://localhost:3000/membership',
    });

    return { sessionId: session.id };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

module.exports = {
  createCheckoutSession
};
*/

// Frontend mock for demonstration
export const mockCreateCheckoutSession = async (planType) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mock session ID
  return { 
    sessionId: 'cs_test_' + Math.random().toString(36).substring(2, 15) 
  };
};