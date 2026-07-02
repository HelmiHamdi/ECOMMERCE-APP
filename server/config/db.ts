import mongoose from "mongoose";

const connectDB = async (retries = 5): Promise<void> => {
    mongoose.connection.on("connected", () => {
        console.log("✅ MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(process.env.MONGODB_URI as string, {
                serverSelectionTimeoutMS: 15000,
                retryWrites: true,
                retryReads: true,
                maxPoolSize: 10,
            });
            return;
        } catch (err) {
            console.error(`Tentative ${attempt}/${retries} échouée:`, (err as Error).message);
            if (attempt === retries) {
                console.error("Impossible de se connecter à MongoDB après plusieurs tentatives.");
                throw err;
            }
            await new Promise((res) => setTimeout(res, 3000 * attempt));
        }
    }
};

export default connectDB;