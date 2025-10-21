import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const createUserSchema = z.object({
  firstname: z.string({}).min(1),
  lastname: z.string({}).min(1),
  email: z.string({}),
  password: z.string({}),
});

const loginUserSchema = z.object({
  email: z.string({}),
  password: z.string({}),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const { schemas: userSchemas, $ref } = buildJsonSchemas(
  {
    createUserSchema,
    loginUserSchema,
    refreshTokenSchema,
  },
  {
    $id: "authSchema",
  }
);
