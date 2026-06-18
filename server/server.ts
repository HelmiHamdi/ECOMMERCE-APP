import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhook } from "./controllers/webhooks.js";
import makeAdmin from "./scripts/makeAdmin.js";
import ProductRouter from "./routers/productRoute.js";
import CartRouter from "./routers/cartRoute.js";
import OrderRouter from "./routers/orderRoute.js";
import AddressRouter from "./routers/addressRoute.js";
import AdminRouter from "./routers/adminRoute.js";
import { seedProducts } from "./scripts/seedProducts.js";
import UserRouter from "./routers/userRoute.js";
import WishlistRouter from "./routers/wishlistRoute.js";
import RatingRouter from "./routers/ratingRoute.js";
import ChatRouter from "./routers/chatRoute.js";

import { cacheMiddleware } from "./middleware/cache.js";
import compression from "compression";
import PaymentRouter from "./routers/paymentRoute.js";
const app = express();

await connectDB();

app.post('/api/clerk', express.raw({type: "application/json"}), clerkWebhook)
// Middleware
app.use(cors())
app.use(compression());
app.use(express.json());
app.use(clerkMiddleware());
app.use(cacheMiddleware); 


const port = process.env.PORT || 3000;


app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use("/api/products",ProductRouter)
app.use("/api/cart",CartRouter)
app.use("/api/orders",OrderRouter)
app.use("/api/addresses",AddressRouter)
app.use("/api/admin",AdminRouter)
app.use("/api/users",UserRouter)
app.use("/api/wishlist", WishlistRouter);
app.use("/api/chat", ChatRouter);
app.use("/api/ratings", RatingRouter);
app.use("/api/payments", PaymentRouter);
await makeAdmin();
 //Seed dummy products if no products are present

 //await seedProducts()
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});