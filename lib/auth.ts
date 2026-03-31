import { auth, currentUser } from "@clerk/nextjs/server";

export const getRequiredAuth = async () => {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized.");

  return { userId };
};

export const getRequiredCurrentUser = async () => {
  const session = await getRequiredAuth();
  const user = await currentUser();

  if (!user) throw new Error("User not found.");

  return {
    ...session,
    user,
  };
};
