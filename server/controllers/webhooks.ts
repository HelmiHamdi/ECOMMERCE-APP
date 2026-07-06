import { verifyWebhook } from "@clerk/express/webhooks";
import { Request, Response } from "express";
import User from "../models/User.js";

export const clerkWebhook = async(req: Request,res: Response)=>{
   try {
    const evt = await verifyWebhook(req)
    console.log("✅ Webhook reçu:", evt.type, evt.data.id); // ← ajoute ça

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
        const user = await User.findOne({clerkId: evt.data.id})

        const userData = {
            clerkId: evt.data.id,
            email: evt.data?.email_addresses[0]?.email_address,
            name: evt.data?.first_name+ " " + evt.data?.last_name,
            image: evt.data?.image_url,
        }
        if(user){
            await User.findOneAndUpdate({ clerkId: evt.data.id }, userData)
        } else{
            const created = await User.create(userData)
            console.log("✅ Utilisateur créé dans Mongo:", created.email); // ← ajoute ça
        }
    } 
    return res.json({success : true , message: "Webhook received"})

  } catch (err) {
    console.error('❌ Error verifying webhook:', err) // ← regarde ce que ça affiche exactement
    return res.status(400).send('Error verifying webhook')
  }  
}