import { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";

import { users } from "@/db/schema";
import { db } from "@/db/index";
import {
  $ref,
  CreateUserInput,
  LoginUserInput,
  RefreshTokenInput,
} from "@/schemas/auth";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import client from "@/utils/redis";

const authenticationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateUserInput }>(
    "/register",
    {
      schema: {
        body: $ref("createUserSchema"),
      },
    },
    async (request, reply) => {
      const { firstname, lastname, email, password } = request.body;
      const hashedPassword = await argon2.hash(password);
      try {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (existingUser.length > 0) {
          return reply.status(400).send({
            success: false,
            message: "User with this email already exists",
          });
        }
        await db
          .insert(users)
          .values({
            firstname,
            lastname,
            email,
            password: hashedPassword,
          })
          .returning();

        return reply.status(201).send({
          success: true,
          message: "User registered successfully",
        });
      } catch (error) {
        return reply
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    }
  );

  fastify.post<{ Body: LoginUserInput }>(
    "/login",
    {
      schema: { body: $ref("loginUserSchema") },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      try {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (user.length === 0) {
          return reply
            .status(400)
            .send({ success: false, message: "Invalid email or password" });
        }

        const validPassword = await argon2.verify(user[0].password, password);
        if (!validPassword) {
          return reply
            .status(400)
            .send({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign(
          { id: user[0].id, email: user[0].email },
          process.env.JWT_SECRET!,
          {
            expiresIn: "10s",
          }
        );

        const refreshToken = jwt.sign(
          { id: user[0].id, email: user[0].email },
          process.env.REFRESH_TOKEN_SECRET!,
          {
            expiresIn: "7d",
          }
        );

        // Store the refresh token in Redis with an expiration time
        await client.setEx(
          `refreshToken:${user[0].id}`,
          7 * 24 * 60 * 60, // 7 days in seconds
          refreshToken
        );

        return reply.status(200).send({
          success: true,
          message: "User logged in successfully",
          token,
          refreshToken,
        });
      } catch (error) {
        throw error;
      }
    }
  );

  fastify.post<{ Body: RefreshTokenInput }>(
    "/refresh",
    {
      schema: { body: $ref("refreshTokenSchema") },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        // Verify the refresh token
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET!
        ) as { id: string; email: string };

        // Check if the refresh token exists in Redis
        const storedToken = await client.get(`refreshToken:${decoded.id}`);

        if (!storedToken || storedToken !== refreshToken) {
          return reply.status(401).send({
            success: false,
            message: "Invalid or expired refresh token",
          });
        }

        // Verify user still exists
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);

        if (user.length === 0) {
          // Clean up invalid token
          await client.del(`refreshToken:${decoded.id}`);
          return reply.status(401).send({
            success: false,
            message: "User not found",
          });
        }

        // Generate new access token
        const newToken = jwt.sign(
          { id: user[0].id, email: user[0].email },
          process.env.JWT_SECRET!,
          {
            expiresIn: "6h",
          }
        );

        // Optionally generate a new refresh token and rotate it
        const newRefreshToken = jwt.sign(
          { id: user[0].id, email: user[0].email },
          process.env.REFRESH_TOKEN_SECRET!,
          {
            expiresIn: "7d",
          }
        );

        // Update the refresh token in Redis
        await client.setEx(
          `refreshToken:${user[0].id}`,
          7 * 24 * 60 * 60, // 7 days in seconds
          newRefreshToken
        );

        return reply.status(200).send({
          success: true,
          message: "Token refreshed successfully",
          token: newToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return reply.status(401).send({
            success: false,
            message: "Invalid refresh token",
          });
        }
        return reply.status(500).send({
          success: false,
          message: "Internal Server Error",
        });
      }
    }
  );

  fastify.post("/logout", async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        message: "Authorization header missing",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
      };

      // Remove the refresh token from Redis
      await client.del(`refreshToken:${decoded.id}`);

      return reply.status(200).send({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        message: "Invalid token",
      });
    }
  });
};

export default authenticationRoutes;
