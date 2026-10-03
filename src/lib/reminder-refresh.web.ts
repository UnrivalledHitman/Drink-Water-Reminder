// Background tasks aren't available on the web.
export async function setBackgroundRefresh(_enabled: boolean) {}

export async function backgroundRefreshAvailable() {
  return true;
}
