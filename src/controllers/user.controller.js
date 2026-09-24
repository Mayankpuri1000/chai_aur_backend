import { User } from "../models/user.models.js";
import { uploadOnCloudiary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(error);
  }
};

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !username?.trim()
    ) {
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
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  // Take data from request body
  const { email, password } = req.body;

  // username or email based login
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Find the user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Password verification
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // Generate access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // Send cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "User logged in successfully",
      data: loggedInUser,
      accessToken,
      refreshToken,
    });
};

export const logOutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: undefined },
    });

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        message: "User logged out successfully",
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
   
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid password" });
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Password changed successfully" });

  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({ message: "Current user fetched successfully", data: req.user });
};

export const updateAccountDetails = async (req, res) => {
  const {fullName, email} = req.body;
  
  if(!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: { fullName, email },
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json({ message: "Account details updated successfully", data: user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const updateUserAvatar = async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath) {
    return res.status(400).json({ message: "Avatar is required" });
  }

  try {
    const avatar = await uploadOnCloudiary(avatarLocalPath);
    if(!avatar) {
      return res.status(400).json({ message: "Avatar upload failed" });
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
      $set: { avatar: avatar.url },
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json({ message: "Avatar updated successfully", data: user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getUserChannelProfile = async (req, res) => {
  const { username } = req.params;

  if(!username?.trim()) {
    return res.status(400).json({ message: "Username is required" });
  }

  const channel = await User.aggregate([
    { $match: { username: username?.toLowerCase() } },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: { $cond: { if: { $in: [req.user?._id, "$subscribers.subscriber"] }, then: true, else: false } }
      }
    }, 
    { $project: {
      _id: 1,
      fullName: 1,
      username: 1,
      avatar: 1,
      coverImage: 1,
      subscribersCount: 1,
      subscribedToCount: 1,
      isSubscribed: 1,
    } }
  ]);

  if(!channel?.length) {
    return res.status(400).json({ message: "Channel not found" });
  }

  return res.status(200).json({ message: "Channel profile fetched successfully", data: channel[0] });
};