export type LearnPathOutputLanguage = "pt-BR" | "source";
export type LearnPathStudyMode = "content" | "language";

export type LearnPathChallengeType = "SELECT" | "ASSIST";

export type LearnPathChallengeOption = {
  id: number;
  challengeId: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type LearnPathChallenge = {
  id: number;
  lessonId: number;
  type: LearnPathChallengeType;
  question: string;
  order: number;
  challengeOptions: LearnPathChallengeOption[];
};

export type LearnPathLesson = {
  id: number;
  title: string;
  unitId: number;
  order: number;
  challenges: LearnPathChallenge[];
};

export type LearnPathUnit = {
  id: number;
  title: string;
  description: string;
  courseId: number;
  order: number;
  lessons: LearnPathLesson[];
};

export type LearnPathCourse = {
  id: number;
  title: string;
  imageSrc: string;
  summary: string;
  sourceType: "text" | "file";
  studyMode: LearnPathStudyMode;
  outputLanguage: LearnPathOutputLanguage;
  estimatedMinutes: number;
  warning: string | null;
  units: LearnPathUnit[];
};

export type LearnPathOutline = {
  title: string;
  summary: string;
  outputLanguage: LearnPathOutputLanguage;
  units: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      challenges: Array<{
        type: LearnPathChallengeType;
        question: string;
        options: Array<{
          text: string;
          correct: boolean;
        }>;
      }>;
    }>;
  }>;
};

export type LearnPathInput = {
  sourceType: "text" | "file";
  studyMode: LearnPathStudyMode;
  outputLanguage: LearnPathOutputLanguage;
  text?: string;
  file?: File | null;
};

export type ExtractedLearnPathContent = {
  sourceType: "text" | "file";
  normalizedText: string;
  titleGuess: string;
  originalFilename: string | null;
  warning: string | null;
};
