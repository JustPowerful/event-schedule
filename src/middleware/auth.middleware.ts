import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.headers.authorization)
    return reply
      .status(401)
      .send({ success: false, message: "Authorization header missing" });

  const fullToken = request.headers.authorization;

  // Format checking steps for the authorization header
  if (fullToken.split(" ").length !== 2) {
    return reply
      .status(401)
      .send({ success: false, message: "Invalid authorization header format" });
  }
  const tokenType = fullToken.split(" ")[0];
  const token = fullToken.split(" ")[1];
  if (tokenType !== "Bearer") {
    return reply
      .status(401)
      .send({ success: false, message: "Invalid token type" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.user = decoded as { id: string; email: string };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({
        success: false,
        message:
          "Access token expired. Please refresh your token using the /auth/refresh endpoint.",
        code: "TOKEN_EXPIRED",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({
        success: false,
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    } else {
      return reply.code(401).send({
        success: false,
        message: "You are not authorized to access this resource",
      });
    }
  }
}
