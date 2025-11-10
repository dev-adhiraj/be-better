// This helper file would contain the actual Stripe integration
// For a real implementation, this would be on your backend server

// In a real backend implementation, you would have:
/*
const stripe = require('stripe')('sk_test_51SPeGEIRSp1WkXTfRteFo2CR3wAPNLf7vO8YnAH5iOZYqbmSCwuNh2KvVLnU542rbaaqYen17CeqFDeQllfTEJpO00xGdFVrSz');

const createCheckoutSession = async (productId) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product: productId,
          unit_amount: productId === 'prod_TMNGgFTylzb8QW' ? 29900 : 19900, // Amount in cents
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: 'http://localhost:3000/dashboard',
    cancel_url: 'http://localhost:3000/membership',
  });

  return session;
};

module.exports = {
  createCheckoutSession
};
*/

// For frontend demonstration only:
export const getProductPrice = (productId) => {
  if (productId === 'prod_TMNGgFTylzb8QW') {
    return 299; // Personal Plan
  } else if (productId === 'prod_TMNNYQxN91G5Ki') {
    return 199; // Business Plan
  }
  return 0;
};