"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";

import { MAX_HEARTS } from "@/constants";
import { getLessonById, getLessonProgress } from "@/lib/learn-path/progress";
import {
  selectActivePreviewCourse,
  selectActivePreviewProgress,
  usePreviewPathStore,
} from "@/store/use-preview-path-store";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { Challenge } from "@/app/lesson/challenge";
import { Footer } from "@/app/lesson/footer";
import { Header } from "@/app/lesson/header";
import { QuestionBubble } from "@/app/lesson/question-bubble";
import { ResultCard } from "@/app/lesson/result-card";

type PreviewLessonPageProps = {
  lessonId: number;
};

export const PreviewLessonPage = ({ lessonId }: PreviewLessonPageProps) => {
  const router = useRouter();
  const course = usePreviewPathStore(selectActivePreviewCourse);
  const { completedChallengeIds, hearts: storeHearts, points } =
    usePreviewPathStore(selectActivePreviewProgress);
  const markChallengeCompleted = usePreviewPathStore(
    (state) => state.markChallengeCompleted
  );
  const spendHeart = usePreviewPathStore((state) => state.spendHeart);
  const restoreHeart = usePreviewPathStore((state) => state.restoreHeart);
  const hasHydrated = usePreviewPathStore((state) => state.hasHydrated);
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });
  const { width, height } = useWindowSize();

  const lesson = course ? getLessonById(course, lessonId) : undefined;
  const initialPercentage = lesson
    ? getLessonProgress(lesson, completedChallengeIds).percentage
    : 0;

  useEffect(() => {
    if (hasHydrated && !course) {
      router.replace("/create");
      return;
    }

    if (hasHydrated && course && !lesson) {
      router.replace("/learn/preview");
    }
  }, [course, hasHydrated, lesson, router]);

  const [hearts, setHearts] = useState(storeHearts);
  const [percentage, setPercentage] = useState(
    initialPercentage === 100 ? 0 : initialPercentage
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!lesson) return 0;

    const uncompletedIndex = lesson.challenges.findIndex(
      (challenge) => !completedChallengeIds.includes(challenge.id)
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });
  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");

  useEffect(() => {
    setHearts(storeHearts);
  }, [storeHearts]);

  useEffect(() => {
    if (hasHydrated && initialPercentage === 100) {
      openPracticeModal();
    }
  }, [hasHydrated, initialPercentage, openPracticeModal]);

  if (!hasHydrated || !course || !lesson) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-600">
            Preview lesson
          </p>
          <h1 className="text-2xl font-bold text-neutral-800">
            Abrindo a lesson...
          </h1>
        </div>
      </div>
    );
  }

  const challenges = lesson.challenges.map((challenge) => ({
    ...challenge,
    completed: completedChallengeIds.includes(challenge.id),
  }));
  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const isPractice = initialPercentage === 100;

  const onContinue = () => {
    if (!selectedOption || !challenge) return;

    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (status === "correct") {
      setActiveIndex((current) => current + 1);
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    const correctOption = options.find((option) => option.correct);

    if (!correctOption) return;

    if (correctOption.id === selectedOption) {
      void correctControls.play();
      setStatus("correct");
      setPercentage((prev) => Math.min(prev + 100 / challenges.length, 100));

      if (isPractice) {
        restoreHeart();
        setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
        return;
      }

      markChallengeCompleted(challenge.id);
      return;
    }

    if (hearts === 0 && !isPractice) {
      openHeartsModal();
      return;
    }

    void incorrectControls.play();
    setStatus("wrong");

    if (!isPractice) {
      spendHeart();
      setHearts((prev) => Math.max(prev - 1, 0));
    }
  };

  if (!challenge) {
    return (
      <>
        {finishAudio}
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />

        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-4 px-6 pt-12 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            Great job! <br /> You&apos;ve completed this preview lesson.
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard variant="points" value={points} />
            <ResultCard variant="hearts" value={hearts} />
          </div>
        </div>

        <Footer
          status="completed"
          onCheck={() => router.push("/learn/preview")}
          practiceHref={`/learn/preview/${lessonId}`}
        />
      </>
    );
  }

  const title =
    challenge.type === "ASSIST"
      ? "Select the correct meaning"
      : challenge.question;

  return (
    <>
      {incorrectAudio}
      {correctAudio}

      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={false}
      />

      <div className="flex-1">
        <div className="flex h-full items-center justify-center">
          <div className="flex w-full flex-col gap-y-12 px-6 lg:min-h-[350px] lg:w-[600px] lg:px-0">
            <h1 className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl">
              {title}
            </h1>

            <div>
              {challenge.type === "ASSIST" ? (
                <QuestionBubble question={challenge.question} />
              ) : null}

              <Challenge
                options={options}
                onSelect={(id) => {
                  if (status !== "none") return;
                  setSelectedOption(id);
                }}
                status={status}
                selectedOption={selectedOption}
                disabled={false}
                type={challenge.type}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={!selectedOption}
        status={status}
        onCheck={onContinue}
      />
    </>
  );
};
