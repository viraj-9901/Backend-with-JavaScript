import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryFileUploder } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

    const existedUser = User.findOne({
        $or: [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409, "user with same username or email already exists")
    }

    const avatarLocalAddress =  req.files?.avatar[0]?.path;
    const coverImageLocalAddess = req.files?.coverImage[0]?.path;

    if(!avatarLocalAddress) throw new ApiError(400, "avatar image require")

    const avatar = await cloudinaryFileUploder(avatarLocalAddress)
    const coverImage = cloudinaryFileUploder(coverImageLocalAddess)

    if(!avatar) throw new ApiError(400, "avatar image require")

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


export {registerUser}