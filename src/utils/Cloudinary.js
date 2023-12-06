import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryFileUploder = async (localFilePath) => {
    // console.log(localFilePath);
    try {
        if(!localFilePath) return null

        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,
            {
                resource_type: "auto",
                // timeout: 100000
            }
        )
    
        //file successfully uploaded on cloudinary
        // console.log('file successfully uploaded on cloudinary: ',response.url);
        console.log(response);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath)
        //locally saved file removed as a error accouring in cloudinary
        console.log(error);
    }
}

export {cloudinaryFileUploder}