import prisma from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { registerSchema, loginSchema } from "../utils/validation";
import { z } from "zod";

const generateTokens = async (userId: number) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m") as any,
  });
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  const refreshExpiresInDays = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS || "7", 10);
  expiresAt.setDate(expiresAt.getDate() + refreshExpiresInDays);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const registerUser = async (
  userData: z.infer<typeof registerSchema>,
) => {
  const { email, name, password, roleId, type, isActive, avatar } = userData;

  const hashedPassword = await bcrypt.hash(password, 10);

  // If no roleId is provided, find the default USER role
  let finalRoleId = roleId;
  if (!finalRoleId) {
    const defaultRole = await prisma.role.findUnique({
      where: { name: "USER" },
    });
    finalRoleId = defaultRole?.id;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      roleId: finalRoleId || null,
      type: type as any,
      isActive: isActive ?? true,
      avatar,
    },
  });

  const tokens = await generateTokens(user.id);
  return { user, ...tokens };
};

export const updateUserProfile = async (
  userId: number,
  profileData: { name?: string; password?: string; avatar?: string }
) => {
  const data: any = {};
  
  if (profileData.name) data.name = profileData.name;
  if (profileData.password) data.password = await bcrypt.hash(profileData.password, 10);
  if (profileData.avatar) data.avatar = profileData.avatar;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return user;
};

export const loginUser = async (loginData: z.infer<typeof loginSchema>) => {
  const { email, password } = loginData;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  if (!user.isActive) {
    throw new Error("User account is inactive. Please contact support.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid credentials");

  const tokens = await generateTokens(user.id);
  return { user, ...tokens };
};

export const refreshAccessToken = async (token: string) => {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken) throw new Error("Invalid refresh token");

  if (refreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token } });
    throw new Error("Refresh token expired");
  }

  const accessToken = jwt.sign(
    { userId: refreshToken.userId },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m") as any },
  );
  return { accessToken };
};

export const logoutUser = async (token: string) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};
