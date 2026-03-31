import { PreviewLessonPage } from "./preview-lesson-page";

type PreviewLessonRouteProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

const LearnPreviewLessonPage = async ({ params }: PreviewLessonRouteProps) => {
  const { lessonId } = await params;

  return <PreviewLessonPage lessonId={Number(lessonId)} />;
};

export default LearnPreviewLessonPage;
