import pragtConfig from "@/lib/pragt-config";
import { createUpdateTextPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createUpdateTextPostHandler(pragtConfig);
