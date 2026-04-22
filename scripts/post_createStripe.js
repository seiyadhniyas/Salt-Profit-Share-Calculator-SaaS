const url = 'https://saltpc.netlify.app/.netlify/functions/createStripeCheckoutSession';
const payload = {
  userId: 'test-user',
  userEmail: 'dev@example.com',
  amountLkr: 30000,
  origin: 'https://saltpc.netlify.app'
};

;(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    try {
      console.log('BODY:', JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log('BODY_TEXT:', text);
    }
  } catch (err) {
    console.error('FETCH_ERROR:', err && (err.stack || err.message || err));
    process.exitCode = 2;
  }
})();
