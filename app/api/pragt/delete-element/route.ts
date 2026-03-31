import pragtConfig from "@/lib/pragt-config";
import { createDeleteElementPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createDeleteElementPostHandler(pragtConfig);
