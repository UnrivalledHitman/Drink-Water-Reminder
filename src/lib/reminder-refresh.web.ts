// Background tasks aren't available on the web.
export async function setBackgroundRefresh(_enabled: boolean) {}

export async function backgroundRefreshAvailable() {
  return true;
}

export async function lastBackgroundRefresh(): Promise<Date | null> {
  return null;
}

export async function runBackgroundRefreshForTesting(): Promise<Date | null> {
  return null;
}
