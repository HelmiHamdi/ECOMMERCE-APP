import api from "./api";
import { CreateNotePayload, Note, UpdateNotePayload } from "./types";




export const getNotes = async (): Promise<Note[]> => {
  const { data } = await api.get("/notes");
  return data.data;
};

export const getNoteById = async (id: string): Promise<Note> => {
  const { data } = await api.get(`/notes/${id}`);
  return data.data;
};

export const createNote = async (payload: CreateNotePayload): Promise<Note> => {
  const { data } = await api.post("/notes", payload);
  return data.data;
};

export const updateNote = async (id: string, payload: UpdateNotePayload): Promise<Note> => {
  const { data } = await api.put(`/notes/${id}`, payload);
  return data.data;
};

export const deleteNote = async (id: string): Promise<void> => {
  await api.delete(`/notes/${id}`);
};