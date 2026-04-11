import express from "express";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { canCreate, canRead, canUpdate } from "../middleware/authorize";
import * as response from "../utils/response";

import * as authController from "../controllers/authController";
import * as userController from "../controllers/userController";
import { uploadMiddleware } from "../middleware/upload";

const router = express.Router();

router.get(
  "/",
  protect,
  canRead("User"),
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
        type: req.user.type,
        role: req.user.role
          ? {
              name: req.user.role.name,
              permissions: req.user.role.permissions.map(({ permission }) => permission),
            }
          : null,
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
  canCreate("User"),
  uploadMiddleware.single("avatar"),
  authController.adminCreateUser,
);

/**
 * Admin: Update a user by ID.
 */
router.patch(
  "/:id",
  protect,
  canUpdate("User"),
  userController.updateUser,
);

export default router;
