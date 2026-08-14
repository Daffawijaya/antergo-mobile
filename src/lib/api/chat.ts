import type { ChatConversation, ChatMessage } from '@/types/api';
import { apiClient } from './client';
export async function listChatConversations() { return (await apiClient.get<{ conversations: ChatConversation[] }>('/chats')).data.conversations; }
export async function listChatMessages(orderId: number) { return (await apiClient.get<{ messages: ChatMessage[] }>(`/orders/${orderId}/messages`)).data.messages; }
export async function sendChatMessage(orderId: number, body: string) { return (await apiClient.post<{ message: ChatMessage }>(`/orders/${orderId}/messages`, { body })).data.message; }
