import { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";

import { users } from "src/db/schema.js";
import { db } from "src/db/index.js";
import { $ref, CreateUserInput, LoginUserInput } from "src/schemas/auth.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

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
            expiresIn: "6h",
          }
        );

        return reply.status(200).send({
          success: true,
          message: "User logged in successfully",
          token,
        });
      } catch (error) {
        return reply
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    }
  );
};

export default authenticationRoutes;
