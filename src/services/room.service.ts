import apiClient from '../lib/api-client';
import type { RoomResponse, CreateRoomRequest } from '../types/api';

export const roomService = {
  getRooms: async (): Promise<RoomResponse[]> => {
    const response = await apiClient.get<RoomResponse[]>('/teacher/rooms');
    return response.data;
  },

  createRoom: async (data: CreateRoomRequest): Promise<void> => {
    await apiClient.post('/teacher/rooms', data);
  },

  deleteRoom: async (roomId: number): Promise<void> => {
    await apiClient.delete(`/teacher/rooms/${roomId}`);
  },
};
