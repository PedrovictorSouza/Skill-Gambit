import pragtConfig from "@/lib/pragt-config";
import { createReparentElementPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createReparentElementPostHandler(pragtConfig);
