import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/authService';
import { User } from '../types/user';
import db from "../db";

// ----------------------- PING -----------------------
const ping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ msg: "ok" });
  } catch (err) {
    next(err);
  }
};

// ----------------------- LOGIN -----------------------
const login = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  try {
    const user = await AuthService.authenticate(username, password);
    const token = await AuthService.generateJwt(user.id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

// ----------------------- FORGOT PASSWORD -----------------------
const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  try {
    await AuthService.sendResetPasswordEmail(email);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

// ----------------------- RESET PASSWORD -----------------------
const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  try {
    await AuthService.resetPassword(token, newPassword);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

// ----------------------- SET PASSWORD -----------------------
const setPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  try {
    await AuthService.setPassword(token, newPassword);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

// ----------------------- CREATE USER -----------------------
const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password, email, first_name, last_name } = req.body;
  try {
    const user: User = {
      username,
      password,
      email,
      first_name,
      last_name
    };

    const userDB = await AuthService.createUser(user);
    res.status(201).json(userDB);
  } catch (err) {
    next(err);
  }
};

// ----------------------- UPDATE USER -----------------------
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const { username, password, email, first_name, last_name } = req.body;
  try {
    const user: User = {
      username,
      password,
      email,
      first_name,
      last_name
    };

    const userDB = await AuthService.updateUser(user);
    res.status(201).json(userDB);
  } catch (err) {
    next(err);
  }
};

// ----------------------- ACTIVATE USER -----------------------
const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  const { token, username } = req.query;

  try {
    if (!token || !username) {
      return res.status(400).send("Missing token or username");
    }

    const user = await db("users")
      .where({ username })
      .andWhere("invite_token", token)
      .andWhere("invite_token_expires", ">", new Date())
      .first();

    if (!user) {
      return res.status(400).send("Invalid or expired activation token");
    }

    await db("users")
      .where({ id: user.id })
      .update({
        activated: true,
        invite_token: null,
        invite_token_expires: null
      });

    return res.send(`
      <h1>Account activated</h1>
      <p>Your account is now active. You may log in.</p>
    `);
  } catch (err) {
    next(err);
  }
};

// ----------------------- EXPORT -----------------------
export default {
  ping,
  login,
  forgotPassword,
  resetPassword,
  setPassword,
  createUser,
  updateUser,
  activateUser
};
