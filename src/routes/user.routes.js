import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logOutUser,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser,
);

router.post("/login", loginUser);

router.post("/logout", verifyJWT, logOutUser);

router.post("/change-password", verifyJWT, changePassword);

router.get("/current-user", verifyJWT, getCurrentUser);

router.put("/account-details", verifyJWT, updateAccountDetails);

router.put(
  "/user-avatar",
  verifyJWT,
  upload.single("avatar"),
  updateUserAvatar,
);

router.get("/user-channel-profile/:username", verifyJWT, getUserChannelProfile);

router.get("/watch-history", verifyJWT, getWatchHistory);

export default router;