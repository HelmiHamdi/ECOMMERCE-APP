import { DeviceEventEmitter } from "react-native";
import { Note } from "./types";

export const NOTES_EVENT = "notes:changed";

export type NotesEventPayload =
  | { action: "create"; note: Note }
  | { action: "update"; note: Note }
  | { action: "delete"; noteId: string };

export const emitNotesChanged = (payload: NotesEventPayload) => {
  DeviceEventEmitter.emit(NOTES_EVENT, payload);
};

export const subscribeNotesChanged = (
  callback: (payload: NotesEventPayload) => void
) => {
  const subscription = DeviceEventEmitter.addListener(NOTES_EVENT, callback);
  return () => subscription.remove();
};