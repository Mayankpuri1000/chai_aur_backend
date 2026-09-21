import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const uploadOnCloudiary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        // Upload the file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"})

        console.log("File uploaded to Cloudinary successfully.", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.error("Error uploading file to Cloudinary: ", error);
        throw error;
    }
}