import pragtConfig from "@/lib/pragt-config";
import { createApplyStylePostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createApplyStylePostHandler(pragtConfig);
