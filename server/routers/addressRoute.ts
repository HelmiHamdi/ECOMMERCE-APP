import express from "express";
import { protect } from "../middleware/auth.js";
import { addAddresses, deleteAddresses, getAddresses, updateAddresses } from "../controllers/addressController.js";


const AddressRouter = express.Router();

AddressRouter.get('/',protect,getAddresses);
AddressRouter.post('/',protect,addAddresses);
AddressRouter.put('/:id',protect,updateAddresses);
AddressRouter.delete('/:id',protect,deleteAddresses);

export default  AddressRouter;