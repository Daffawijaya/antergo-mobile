export const chatKeys = { all: ['chats'] as const, thread: (orderId: number) => ['chats', orderId] as const };
