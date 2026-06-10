import axiosInstance from './axiosInstance';

export const getProjects = async () => {
  const { data } = await axiosInstance.get('/projects');
  return data?.data || [];
};

export const createProject = async (payload) => {
  const { data } = await axiosInstance.post('/projects', payload);
  return data?.data || data;
};

export const updateProject = async (id, payload) => {
  const { data } = await axiosInstance.put(`/projects/${id}`, payload);
  return data?.data || data;
};

export const deleteProject = async (id) => {
  await axiosInstance.delete(`/projects/${id}`);
};
