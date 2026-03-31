import pragtConfig from "@/lib/pragt-config";
import { createSwapElementsPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createSwapElementsPostHandler(pragtConfig);
