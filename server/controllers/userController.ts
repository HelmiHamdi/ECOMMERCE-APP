import { Request, Response } from "express";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { clerkClient } from "@clerk/express";

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: req.user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const { name, phone, firstName, lastName } = req.body;

    let imageUrl: string | undefined;

    if (req.file) {
      const uploadResult: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "shop-mobile/avatars",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file!.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (imageUrl) updates.image = imageUrl;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Sync with Clerk
    try {
      const clerkUpdate: any = {};
      if (firstName !== undefined && firstName !== "") clerkUpdate.firstName = firstName;
      if (lastName !== undefined && lastName !== "") clerkUpdate.lastName = lastName;

      if (Object.keys(clerkUpdate).length > 0) {
        await clerkClient.users.updateUser(userId, clerkUpdate);
      }

      if (imageUrl && req.file) {
        await clerkClient.users.updateUserProfileImage(userId, {
          file: req.file.buffer as any,
        });
      }
    } catch (clerkError: any) {
      console.error("CLERK SYNC ERROR:", clerkError.message);
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const savePushToken = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  if (!expoPushToken) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      }),
    });
  } catch (error) {
    console.error("Push notification error:", error);
  }
};