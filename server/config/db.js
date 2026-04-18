const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGOOSE_KEY, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    })
    console.log("✅ MongoDB Atlas Connected Successfully!");
    
  } catch (error) {
    console.log("❌ Failed to Connect to MongoDB Atlas - will retry automatically");
    console.log(error.message);
    // Do NOT call process.exit(1) - server stays alive, Mongoose will retry
    // This allows Render health checks to pass even if Atlas is slow to wake
    setTimeout(connectDB, 5000); // retry after 5 seconds
  }
}


module.exports = connectDB