import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@offline_';

export async function saveLocally<T>(key: string, data: T): Promise<void> {
  try {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
  } catch (error) {
    console.error(`Failed to save ${key} locally:`, error);
    throw error;
  }
}

export async function getLocal<T>(key: string, maxAge?: number): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!stored) return null;

    const { data, timestamp } = JSON.parse(stored);

    if (maxAge && Date.now() - timestamp > maxAge) {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error(`Failed to get ${key} from local storage:`, error);
    return null;
  }
}

export async function clearLocal(key?: string): Promise<void> {
  try {
    if (key) {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(offlineKeys);
    }
  } catch (error) {
    console.error('Failed to clear local storage:', error);
    throw error;
  }
}
