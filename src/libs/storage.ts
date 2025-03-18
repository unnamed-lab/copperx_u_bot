import { getUserData, setUserData, deleteUserData } from "./redis";

const getSession = async (userId: string) => {
  return await getUserData(userId);
};

const setSession = async (userId: string, data: any) => {
  await setUserData(userId, data);
};

const clearSession = async (userId: string) => {
  await deleteUserData(userId);
};

export { getSession, setSession, clearSession };
