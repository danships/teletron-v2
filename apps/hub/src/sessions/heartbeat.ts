export function heartbeat(ping: () => void, close: (code: number) => void) {
  let last = Date.now();
  const check = setInterval(() => {
    if (Date.now() - last >= 25_000) close(4004);
  }, 1000);
  const pulse = setInterval(ping, 10_000);
  return {
    activity: () => (last = Date.now()),
    stop: () => {
      clearInterval(check);
      clearInterval(pulse);
    },
  };
}
