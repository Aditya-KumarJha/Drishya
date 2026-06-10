import axiosInstance from './axiosInstance';

export const getBillingSummary = async () => {
  const { data } = await axiosInstance.get('/billing/summary');
  return data?.data || data;
};

export const createCreditOrder = async (planId) => {
  const { data } = await axiosInstance.post('/billing/orders', { planId });
  return data?.data || data;
};

export const verifyCreditPayment = async (payload) => {
  const { data } = await axiosInstance.post('/billing/verify', payload);
  return data?.data || data;
};
