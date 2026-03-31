import pragtConfig from "@/lib/pragt-config";
import { createAddParagraphChildPostHandler } from "@/packages/pragt-css/src/next/index.js";

export const POST = createAddParagraphChildPostHandler(pragtConfig);
