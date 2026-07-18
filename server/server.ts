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
import BannerRouter from "./routers/bannerRoute.js";
import ChatRouter from "./routers/chatRoute.js";
import NotificationRouter from "./routers/notificationRoute.js"; 
import { backfillOrderItemNames } from "./scripts/backfillOrderItemNames.js";
import { cacheMiddleware } from "./middleware/cache.js";
import compression from "compression";
import PaymentRouter from "./routers/paymentRoute.js";
import { scheduleDailyReminder } from "./scripts/dailyReminder.js"; 
import NewsletterRouter from "./routers/newsletterRoutes.js";
import OfferRouter from "./routers/offerRoutes.js";
import SupportRouter from "./routers/supportRoutes.js";
import GifRouter from "./routers/gifRoute.js";


const app = express();
console.time("connectDB");

try {
    await connectDB();
} catch (err) {
    console.error("Échec critique de connexion à la base de données:", err);
    process.exit(1);
}
console.timeEnd("connectDB");

app.post('/api/clerk', express.raw({type: "application/json"}), clerkWebhook)

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
app.use("/api/banners", BannerRouter);
app.use("/api/payments", PaymentRouter);
app.use("/api/notifications", NotificationRouter); 
app.use("/api/newsletter", NewsletterRouter);
app.use("/api/offers", OfferRouter);
app.use("/api/support", SupportRouter);
app.use("/api/gifs", GifRouter);

await makeAdmin();

await backfillOrderItemNames();

 //await seedProducts()

scheduleDailyReminder(); 

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});