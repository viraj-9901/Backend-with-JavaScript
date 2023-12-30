import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryFileUploder } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()  
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating access and refresh token')
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // res.status(200).json({
    //     message: "ok"
    // })

    //to register user 
    /**
        - get user info from user such as name, email, image etc. through payload and json
        - set image in local server for a while and send that image to cloudinary and remove image from
          local server.
        - add user info to mongoDB  
    */

    const {username, email, fullname, password} = req.body;
    // console.log('username: ',username);

    if(
        [username, email, fullname, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"all field are required")
    }

    const existedUser = await User.findOne({
        $or: [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409, "user with same username or email already exists")
    }

    console.log(req.files);
    // req.files?.avatar[0]?.path

    const avatarLocalAddress =  req.files?.avatar[0]?.path
    // console.log(avatarLocalAddress);

    // const coverImageLocalAddess = req.files?.coverImage[0]?.path;
    let coverImageLocalAddess
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalAddess = req.files.coverImage[0].path
    }

    if(!avatarLocalAddress) throw new ApiError(400, "avatar image required")

    const avatar = await cloudinaryFileUploder(avatarLocalAddress)
    const coverImage = await cloudinaryFileUploder(coverImageLocalAddess)

    if(!avatar) {
        throw new ApiError(400, "avatar image requiredd")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) throw new ApiError(500, "Somrthing went wroung while registering user")

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user register successfully!")
    )

} )

const loginUser = asyncHandler( async (req,res) => {
    const {username, email, password} = req.body;

    if(!(username || !email)){
        throw new ApiError(400,'username or email require for login')
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(400,'user with this username or email not found')
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400,'Username or Password incorrect')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logOutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        } 
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",option)
    .clearCookie("RegreshToken",option)
    .json(
        new ApiResponse(200, {}, "User logged out ")
    )


})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = Jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        
        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);

        const option = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .Cookie("accessToken",accessToken,option)
        .Cookie("refreshToken",newRefreshToken,option)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed"
            )
        )


    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changePassword = asyncHandler( async(req,res) => {
    try {
        const {oldpassword, newPassword} = req.body;
    
        const user = await User.findById(req.user._id);
    
        if(!user){
            throw new ApiError(400,"Invalid access token")
        }
    
        if(oldpassword === user.password){
            throw new ApiError(400,"Invalid old password")
        }
    
        user.password = newPassword
    
        await user.save({validateBeforeSave: false})
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const updateAccountDetail = asyncHandler( async(req,res) => {
    const {fullname, email} = req.body;

    if(!fullname || !email){
        throw new ApiError(400, "fullname and email required");
    }

    const user = await User.findByIdAndUpdate(
        req,user._id,
        {
            $set:{
                fullname: fullname,
                email: email
            }
        },
        {
            new: true
        }
    ).select('-password');

    return res.status(200).json(new ApiResponse(200, user, "Account details update successfully"))
})

const getCurrentUser = asyncHandler( async(req,res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "user fetched successfully"))
})

const updateAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await cloudinaryFileUploder(avatarLocalPath);

    if(!avatar){
        throw new ApiError(500, "Error happen whlie uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select('-password')

    return res.status(200).json(new ApiResponse(200, user, "Avatar image update successfully"))
})

const updateCoverImage = asyncHandler( async(req,res) => {
    const CoverLocalPath = req.file?.path;

    if(!CoverLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const coverImage = await cloudinaryFileUploder(CoverLocalPath);

    if(!coverImage){
        throw new ApiError(500, "Error happen whlie uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select('-password')

    return res.status(200).json(new ApiResponse(200, user, "Cover image update successfully"))
})


export {
    registerUser, 
    loginUser, 
    logOutUser, 
    refreshAccessToken, 
    changePassword, 
    updateAccountDetail,
    getCurrentUser,
    updateAvatar,
    updateCoverImage
}