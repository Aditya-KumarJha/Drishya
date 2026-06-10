import axiosInstance from './axiosInstance';

export const getPublicStatus = async (slug) => {
  const { data } = await axiosInstance.get(`/status/${slug}`);
  return data?.data || data;
};
