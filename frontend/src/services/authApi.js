import axiosInstance, { authAxiosInstance } from './axiosInstance';


export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const updateProfile = async (payload) => {
  const { data } = await axiosInstance.put('/auth/profile', payload);
  return data?.user || data?.data?.user || data;
};
