import pragtConfig from "@/lib/pragt-config";
import { createAnalyzeHooksPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createAnalyzeHooksPostHandler(pragtConfig);
