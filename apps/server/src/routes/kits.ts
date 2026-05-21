import type { FastifyPluginAsync } from "fastify";
import { packingFormSchema } from "@todoer/shared";
import { generatePackingList } from "../services/kits/packing";

export const kitsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/kits/packing/generate",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const parsed = packingFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      try {
        const preview = await generatePackingList(parsed.data);
        return preview;
      } catch (err) {
        req.log.error({ err }, "packing kit generate failed");
        return reply.code(503).send({ error: "kit_unavailable" });
      }
    },
  );
};
