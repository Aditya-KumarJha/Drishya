import { createCreditOrder, verifyCreditPayment } from './billingApi';

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });

export const openCreditCheckout = async ({ planId, user, onSuccess }) => {
  await loadRazorpayScript();
  const order = await createCreditOrder(planId);

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'Drishya',
      description: `${order.plan?.name || 'Credit'} pack - ${order.plan?.credits || ''} credits`,
      order_id: order.orderId,
      prefill: {
        name: user?.fullName || order.prefill?.name || '',
        email: user?.email || order.prefill?.email || '',
      },
      notes: {
        planId: order.plan?.id || planId,
      },
      theme: {
        color: '#1E6BFF',
      },
      handler: async (response) => {
        try {
          const summary = await verifyCreditPayment({
            planId: order.plan?.id || planId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          onSuccess?.(summary);
          resolve(summary);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });

    razorpay.open();
  });
};
