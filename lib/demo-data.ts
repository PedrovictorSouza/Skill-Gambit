import { MAX_HEARTS } from "@/constants";
import {
  challengeOptions,
  challenges,
  courses,
  lessons,
  units,
  userProgress,
  userSubscription,
} from "@/db/schema";

type Course = typeof courses.$inferSelect;
type Unit = typeof units.$inferSelect;
type Lesson = typeof lessons.$inferSelect;
type Challenge = typeof challenges.$inferSelect;
type ChallengeOption = typeof challengeOptions.$inferSelect;
type UserProgress = typeof userProgress.$inferSelect;
type UserSubscription = typeof userSubscription.$inferSelect;

type LessonSummary = Lesson & {
  completed: boolean;
};

type UnitWithLessons = Unit & {
  lessons: LessonSummary[];
};

type CourseWithUnits = Course & {
  units: (Unit & {
    lessons: Lesson[];
  })[];
};

type ActiveLesson = Lesson & {
  unit: Unit;
};

type LessonWithChallenges = Lesson & {
  challenges: (Challenge & {
    completed: boolean;
    challengeOptions: ChallengeOption[];
  })[];
};

type UserProgressWithCourse = UserProgress & {
  activeCourse: Course | null;
};

type UserSubscriptionWithActive = UserSubscription & {
  isActive: boolean;
};

type LeaderboardUser = Pick<
  UserProgress,
  "userId" | "userName" | "userImageSrc" | "points"
>;

const buildDemoCourse = (
  id: number,
  title: string,
  imageSrc: string
): Course => ({
  id,
  title,
  imageSrc,
  userId: "demo-user",
  importId: null,
  status: "published",
  summary: `Demo course for ${title}.`,
  sourceType: "text",
  estimatedMinutes: 20,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const demoCourses: Course[] = [
  buildDemoCourse(1, "Spanish", "/es.svg"),
  buildDemoCourse(2, "French", "/fr.svg"),
  buildDemoCourse(3, "Japanese", "/jp.svg"),
  buildDemoCourse(4, "Italian", "/it.svg"),
];

const demoUnits: Unit[] = [
  {
    id: 1,
    title: "Unit 1",
    description: "Greetings, basics and common nouns.",
    courseId: 1,
    order: 1,
  },
  {
    id: 2,
    title: "Unit 2",
    description: "Food, places and simple travel phrases.",
    courseId: 1,
    order: 2,
  },
];

const demoLessons: Lesson[] = [
  { id: 101, title: "Basics 1", unitId: 1, order: 1 },
  { id: 102, title: "Basics 2", unitId: 1, order: 2 },
  { id: 103, title: "People", unitId: 1, order: 3 },
  { id: 104, title: "Food", unitId: 1, order: 4 },
  { id: 201, title: "Travel 1", unitId: 2, order: 1 },
  { id: 202, title: "Travel 2", unitId: 2, order: 2 },
];

const demoLessonDetails: Record<number, LessonWithChallenges> = {
  101: {
    id: 101,
    title: "Basics 1",
    unitId: 1,
    order: 1,
    challenges: [
      {
        id: 1001,
        lessonId: 101,
        type: "ASSIST",
        question: "hola",
        order: 1,
        completed: true,
        challengeOptions: [
          {
            id: 10001,
            challengeId: 1001,
            text: "hello",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10002,
            challengeId: 1001,
            text: "goodbye",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10003,
            challengeId: 1001,
            text: "please",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
      {
        id: 1002,
        lessonId: 101,
        type: "SELECT",
        question: "Select \"boy\"",
        order: 2,
        completed: true,
        challengeOptions: [
          {
            id: 10004,
            challengeId: 1002,
            text: "boy",
            correct: true,
            imageSrc: "/boy.svg",
            audioSrc: "/es_boy.mp3",
          },
          {
            id: 10005,
            challengeId: 1002,
            text: "woman",
            correct: false,
            imageSrc: "/woman.svg",
            audioSrc: "/es_woman.mp3",
          },
          {
            id: 10006,
            challengeId: 1002,
            text: "robot",
            correct: false,
            imageSrc: "/robot.svg",
            audioSrc: "/es_robot.mp3",
          },
          {
            id: 10007,
            challengeId: 1002,
            text: "girl",
            correct: false,
            imageSrc: "/girl.svg",
            audioSrc: "/es_girl.mp3",
          },
        ],
      },
    ],
  },
  102: {
    id: 102,
    title: "Basics 2",
    unitId: 1,
    order: 2,
    challenges: [
      {
        id: 1003,
        lessonId: 102,
        type: "ASSIST",
        question: "gracias",
        order: 1,
        completed: true,
        challengeOptions: [
          {
            id: 10008,
            challengeId: 1003,
            text: "thanks",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10009,
            challengeId: 1003,
            text: "good night",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10010,
            challengeId: 1003,
            text: "friend",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
      {
        id: 1004,
        lessonId: 102,
        type: "SELECT",
        question: "Select \"man\"",
        order: 2,
        completed: true,
        challengeOptions: [
          {
            id: 10011,
            challengeId: 1004,
            text: "man",
            correct: true,
            imageSrc: "/man.svg",
            audioSrc: "/es_man.mp3",
          },
          {
            id: 10012,
            challengeId: 1004,
            text: "zombie",
            correct: false,
            imageSrc: "/zombie.svg",
            audioSrc: "/es_zombie.mp3",
          },
          {
            id: 10013,
            challengeId: 1004,
            text: "girl",
            correct: false,
            imageSrc: "/girl.svg",
            audioSrc: "/es_girl.mp3",
          },
          {
            id: 10014,
            challengeId: 1004,
            text: "woman",
            correct: false,
            imageSrc: "/woman.svg",
            audioSrc: "/es_woman.mp3",
          },
        ],
      },
    ],
  },
  103: {
    id: 103,
    title: "People",
    unitId: 1,
    order: 3,
    challenges: [
      {
        id: 1005,
        lessonId: 103,
        type: "ASSIST",
        question: "mujer",
        order: 1,
        completed: true,
        challengeOptions: [
          {
            id: 10015,
            challengeId: 1005,
            text: "woman",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10016,
            challengeId: 1005,
            text: "robot",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10017,
            challengeId: 1005,
            text: "boy",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
      {
        id: 1006,
        lessonId: 103,
        type: "SELECT",
        question: "Select \"robot\"",
        order: 2,
        completed: false,
        challengeOptions: [
          {
            id: 10018,
            challengeId: 1006,
            text: "robot",
            correct: true,
            imageSrc: "/robot.svg",
            audioSrc: "/es_robot.mp3",
          },
          {
            id: 10019,
            challengeId: 1006,
            text: "boy",
            correct: false,
            imageSrc: "/boy.svg",
            audioSrc: "/es_boy.mp3",
          },
          {
            id: 10020,
            challengeId: 1006,
            text: "man",
            correct: false,
            imageSrc: "/man.svg",
            audioSrc: "/es_man.mp3",
          },
          {
            id: 10021,
            challengeId: 1006,
            text: "woman",
            correct: false,
            imageSrc: "/woman.svg",
            audioSrc: "/es_woman.mp3",
          },
        ],
      },
      {
        id: 1007,
        lessonId: 103,
        type: "ASSIST",
        question: "niña",
        order: 3,
        completed: false,
        challengeOptions: [
          {
            id: 10022,
            challengeId: 1007,
            text: "girl",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10023,
            challengeId: 1007,
            text: "man",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10024,
            challengeId: 1007,
            text: "friend",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
    ],
  },
  104: {
    id: 104,
    title: "Food",
    unitId: 1,
    order: 4,
    challenges: [
      {
        id: 1008,
        lessonId: 104,
        type: "ASSIST",
        question: "pan",
        order: 1,
        completed: false,
        challengeOptions: [
          {
            id: 10025,
            challengeId: 1008,
            text: "bread",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10026,
            challengeId: 1008,
            text: "milk",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10027,
            challengeId: 1008,
            text: "water",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
      {
        id: 1009,
        lessonId: 104,
        type: "ASSIST",
        question: "agua",
        order: 2,
        completed: false,
        challengeOptions: [
          {
            id: 10028,
            challengeId: 1009,
            text: "water",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10029,
            challengeId: 1009,
            text: "juice",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10030,
            challengeId: 1009,
            text: "coffee",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
    ],
  },
  201: {
    id: 201,
    title: "Travel 1",
    unitId: 2,
    order: 1,
    challenges: [
      {
        id: 1010,
        lessonId: 201,
        type: "ASSIST",
        question: "hotel",
        order: 1,
        completed: false,
        challengeOptions: [
          {
            id: 10031,
            challengeId: 1010,
            text: "hotel",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10032,
            challengeId: 1010,
            text: "airport",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10033,
            challengeId: 1010,
            text: "station",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
    ],
  },
  202: {
    id: 202,
    title: "Travel 2",
    unitId: 2,
    order: 2,
    challenges: [
      {
        id: 1011,
        lessonId: 202,
        type: "ASSIST",
        question: "billete",
        order: 1,
        completed: false,
        challengeOptions: [
          {
            id: 10034,
            challengeId: 1011,
            text: "ticket",
            correct: true,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10035,
            challengeId: 1011,
            text: "passport",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
          {
            id: 10036,
            challengeId: 1011,
            text: "train",
            correct: false,
            imageSrc: null,
            audioSrc: null,
          },
        ],
      },
    ],
  },
};

const demoActiveCourse = demoCourses[0];
const demoActiveLesson = demoLessons[2];
const demoActiveUnit = demoUnits[0];

const demoUserProgress: UserProgressWithCourse = {
  userId: "demo-user",
  userName: "Demo Learner",
  userImageSrc: "/mascot.svg",
  activeCourseId: demoActiveCourse.id,
  hearts: MAX_HEARTS - 2,
  points: 120,
  activeCourse: demoActiveCourse,
};

const demoLeaderboard: LeaderboardUser[] = [
  { userId: "u1", userName: "Alex", userImageSrc: "/boy.svg", points: 1440 },
  { userId: "u2", userName: "Maya", userImageSrc: "/girl.svg", points: 1320 },
  { userId: "u3", userName: "Jon", userImageSrc: "/man.svg", points: 1280 },
  { userId: "u4", userName: "Rosa", userImageSrc: "/woman.svg", points: 1200 },
  { userId: "u5", userName: "Byte", userImageSrc: "/robot.svg", points: 1110 },
  { userId: "u6", userName: "Nora", userImageSrc: "/girl.svg", points: 980 },
  { userId: "u7", userName: "Theo", userImageSrc: "/boy.svg", points: 910 },
  { userId: "u8", userName: "Lia", userImageSrc: "/woman.svg", points: 820 },
  { userId: "u9", userName: "Kai", userImageSrc: "/man.svg", points: 760 },
  { userId: "u10", userName: "Zed", userImageSrc: "/zombie.svg", points: 710 },
];

const getLessonSummary = (lesson: Lesson): LessonSummary => ({
  ...lesson,
  completed:
    demoLessonDetails[lesson.id]?.challenges.every((challenge) => challenge.completed) ??
    false,
});

export const getDemoCourses = async () => demoCourses.map((course) => ({ ...course }));

export const getDemoUserProgress = async () => ({
  ...demoUserProgress,
  activeCourse: demoUserProgress.activeCourse
    ? { ...demoUserProgress.activeCourse }
    : null,
});

export const getDemoUnits = async (): Promise<UnitWithLessons[]> =>
  demoUnits.map((unit) => ({
    ...unit,
    lessons: demoLessons
      .filter((lesson) => lesson.unitId === unit.id)
      .map(getLessonSummary),
  }));

export const getDemoCourseById = async (
  courseId: number
): Promise<CourseWithUnits | undefined> => {
  const course = demoCourses.find((item) => item.id === courseId);

  if (!course) return undefined;

  return {
    ...course,
    units: demoUnits
      .filter((unit) => unit.courseId === courseId)
      .map((unit) => ({
        ...unit,
        lessons: demoLessons
          .filter((lesson) => lesson.unitId === unit.id)
          .map((lesson) => ({ ...lesson })),
      })),
  };
};

export const getDemoCourseProgress = async () => ({
  activeLesson: {
    ...demoActiveLesson,
    unit: { ...demoActiveUnit },
  } satisfies ActiveLesson,
  activeLessonId: demoActiveLesson.id,
});

export const getDemoLesson = async (
  id?: number
): Promise<LessonWithChallenges | null> => {
  const lessonId = id ?? demoActiveLesson.id;
  const lesson = demoLessonDetails[lessonId];

  if (!lesson) return null;

  return {
    ...lesson,
    challenges: lesson.challenges.map((challenge) => ({
      ...challenge,
      challengeOptions: challenge.challengeOptions.map((option) => ({
        ...option,
      })),
    })),
  };
};

export const getDemoLessonPercentage = async () => {
  const lesson = await getDemoLesson();

  if (!lesson) return 0;

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );

  return Math.round((completedChallenges.length / lesson.challenges.length) * 100);
};

export const getDemoUserSubscription = async (): Promise<UserSubscriptionWithActive | null> =>
  null;

export const getDemoTopTenUsers = async () =>
  demoLeaderboard.map((user) => ({ ...user }));
