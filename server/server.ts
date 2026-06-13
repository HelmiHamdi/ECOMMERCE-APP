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


const app = express();

await connectDB();

app.post('/api/clerk', express.raw({type: "application/json"}), clerkWebhook)
// Middleware
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware());



const port = process.env.PORT || 3000;


app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use("/api/products",ProductRouter)
app.use("/api/cart",CartRouter)
app.use("/api/order",OrderRouter)
app.use("/api/addresses",AddressRouter)
app.use("/api/admin",AdminRouter)
await makeAdmin();

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});