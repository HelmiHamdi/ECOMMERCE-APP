import { Request, Response } from "express";
import Address from "../models/Address.js";
import { invalidateCache } from "../middleware/cache.js";

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: addresses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addAddresses = async (req: Request, res: Response) => {
  try {
    const { type, street, city, state, zipCode, country, isDefault } =
      req.body;

    const ops: Promise<any>[] = [
      Address.create({
        user: req.user._id,
        type,
        street,
        city,
        state,
        zipCode,
        country,
        isDefault: isDefault || false,
      }),
    ];
    if (isDefault) {
      ops.push(
        Address.updateMany({ user: req.user._id }, { isDefault: false })
      );
    }
    const [newAddress] = await Promise.all(ops);
    invalidateCache("addresses");
    res.status(201).json({ success: true, data: newAddress });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAddresses = async (req: Request, res: Response) => {
  try {
    const { type, street, city, state, zipCode, country, isDefault } =
      req.body;


    const updated = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { type, street, city, state, zipCode, country, isDefault },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found or not authorized" });
    }

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    invalidateCache("addresses");
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAddresses = async (req: Request, res: Response) => {
  try {
    const deleted = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found or not authorized" });
    }
    invalidateCache("addresses");
    res.json({ success: true, message: "Address removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};