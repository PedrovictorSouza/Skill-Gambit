import pragtConfig from "@/lib/pragt-config";
import { createWrapElementsPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createWrapElementsPostHandler(pragtConfig);
