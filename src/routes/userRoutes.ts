import express from "express";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { canManage } from "../middleware/authorize";
import * as response from "../utils/response";

import * as authController from "../controllers/authController";
import * as userController from "../controllers/userController";
import { uploadMiddleware } from "../middleware/upload";

const router = express.Router();

router.get(
  "/",
  protect,
  canManage("User"),
  userController.listUsers,
);

router.get("/profile", protect, (req: AuthRequest, res) => {
  const user = req.user
    ? {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        phoneNumber: req.user.phoneNumber,
        gender: req.user.gender,
        avatar: req.user.avatar,
        role: req.user.role ? { name: req.user.role.name } : null,
        ...(req.user.role?.name === "ADMIN"
          ? {
              permission: req.user.role.permissions.map(({ permission }) => permission),
            }
          : {}),
      }
    : null;

  return response.ok(res, "User profile retrieved", { user });
});

router.patch(
  "/profile",
  protect,
  uploadMiddleware.single("avatar"),
  authController.updateProfile,
);

/**
 * Admin: Create a new user with specific role.
 */
router.post(
  "/create",
  protect,
  canManage("User"),
  uploadMiddleware.single("avatar"),
  authController.adminCreateUser,
);


export default router;
