import { NextFunction, Request, Response } from "express";
import {
  loginService,
  logoutService,
  profileService,
  refreshService,
  registerService,
} from "../services/auth.service";

export const registerController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      name: string;
      password: string;
      avatar: any;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : "";
    const result = await registerService({ ...body, avatar });

    res.status(201).json({
      message: "Registered Successfully",
      user: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body;
    const { user, token } = await loginService(body);

    res.cookie("refreshToken", token.refreshToken, {
      httpOnly: true,
      secure: false,
    });

    res.status(200).json({
      message: "loginned successfully",
      user: {
        user,
        accessToken: token.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await refreshService(token);

    res.status(200).json({
      message: "Refresh successfully done",
      token: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const profileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await profileService(token);

    res.status(200).json({
      message: "Profile",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await logoutService(token);

    res.status(200).json({
      message: "logoutted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
