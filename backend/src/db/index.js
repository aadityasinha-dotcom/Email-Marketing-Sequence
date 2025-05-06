import mongoose from "mongoose";

const connectToDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/email_marketing_db');
    console.log("Connection to db established");
  } catch (error) {
    console.log("Error while connecting to database: ", error);
    process.exit(1);
  }
};

export default connectToDB;
