import mongoose, { Schema } from "mongoose";

export interface IAppSettings extends mongoose.Document {
  key: string;
  devisEnabled: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    devisEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const AppSettings = mongoose.model<IAppSettings>("AppSettings", appSettingsSchema);

export default AppSettings;