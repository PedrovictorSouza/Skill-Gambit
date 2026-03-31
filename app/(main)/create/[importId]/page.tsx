import { notFound } from "next/navigation";

import { getImportReviewData } from "@/db/queries";
import { isDemoMode } from "@/lib/demo-mode";

import { ReviewWorkspace } from "./review-workspace";

type CreateImportPageProps = {
  params: Promise<{
    importId: string;
  }>;
};

const CreateImportPage = async ({ params }: CreateImportPageProps) => {
  if (isDemoMode) notFound();

  const { importId } = await params;
  const data = await getImportReviewData(Number(importId));

  if (!data) notFound();

  return <ReviewWorkspace initialData={data} />;
};

export default CreateImportPage;
