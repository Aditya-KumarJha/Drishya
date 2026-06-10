import axiosInstance from './axiosInstance';

export const getChatConversations = async () => {
  const { data } = await axiosInstance.get('/chat/conversations');
  return data?.data || [];
};

export const getChatConversation = async (id) => {
  const { data } = await axiosInstance.get(`/chat/conversations/${id}`);
  return data?.data || data;
};

export const createChatConversation = async ({ title, monitorIds = [] }) => {
  const { data } = await axiosInstance.post('/chat/conversations', { title, monitorIds });
  return data?.data || data;
};

export const updateChatConversation = async (id, payload) => {
  const { data } = await axiosInstance.patch(`/chat/conversations/${id}`, payload);
  return data?.data || data;
};

export const deleteChatConversation = async (id) => {
  const { data } = await axiosInstance.delete(`/chat/conversations/${id}`);
  return data?.data || data;
};

export const askChatQuestion = async ({ conversationId, title, question, monitorIds = [], saveToMemory = true }) => {
  const { data } = await axiosInstance.post('/chat/ask', {
    conversationId,
    title,
    question,
    monitorIds,
    saveToMemory,
  });
  return data?.data || data;
};
