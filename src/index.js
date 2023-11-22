import dotenv from 'dotenv';
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})
connectDB();


// Another way to connect database
// import mongoose from 'mongoose';
// import { DB_NAME } from './constants.js'; 
// import express from 'express';

// const app = express()

// // iife function
// ( async () => {
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on("error",(error)=>{
//             console.log(error);
//             throw error;
//        }) 
//        app.listen(process.env.PORT || 8000, () => {
//             console.log(`server started at port ${process.env.PORT}`);
//        })
//     } catch (error) {
//         console.log('mongoDB connection error: ', error);
//         throw error
//     }
// } )()