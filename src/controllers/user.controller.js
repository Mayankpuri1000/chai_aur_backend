import { User } from "../models/user.models.js";
import { uploadOnCloudiary } from "../utils/cloudinary.js";

export const registerUser = async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;

        if (!fullName?.trim() || !email?.trim() || !password?.trim() || !username?.trim()) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existedUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if (!avatarLocalPath) {
            return res.status(400).json({ message: "Avatar is required" });
        }

        const avatar = await uploadOnCloudiary(avatarLocalPath);
        const coverImage = coverImageLocalPath
            ? await uploadOnCloudiary(coverImageLocalPath)
            : null;

        if (!avatar) {
            return res.status(400).json({ message: "Avatar upload failed" });
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken",
        );

        if (!createdUser) {
            return res.status(500).json({ message: "User registration failed" });
        }

        return res.status(201).json({
            message: "User registered successfully",
            data: createdUser,
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
