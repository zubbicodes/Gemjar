const target = process.env.TARGET_URL || "http://localhost:3000";
const requests = Number(process.env.LOAD_REQUESTS || 100);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const latencies = [];
let failures = 0;
async function hit() {
  const started = performance.now();
  try {
    const response = await fetch(`${target}/shop`);
    if (!response.ok) failures++;
  } catch {
    failures++;
  } finally {
    latencies.push(performance.now() - started);
  }
}
for (let offset = 0; offset < requests; offset += concurrency)
  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests - offset) }, () =>
      hit(),
    ),
  );
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
const result = {
  target,
  requests,
  concurrency,
  failures,
  p95Ms: Math.round(p95),
};
console.log(JSON.stringify(result));
if (failures || p95 > 2500) process.exitCode = 1;
