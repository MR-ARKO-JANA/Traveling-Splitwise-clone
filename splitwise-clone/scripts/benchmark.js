const http = require('http');
const url = require('url');

/**
 * Minimalist Zero-Dependency Load Testing / Benchmarking Script for Splitwise Clone
 */

// Read config from arguments or env
const TARGET_URL =
  process.argv[2] || process.env.BENCHMARK_URL || 'http://localhost:5000/api/health';
const TOTAL_REQUESTS = parseInt(process.argv[3] || process.env.BENCHMARK_REQUESTS || '1000', 10);
const CONCURRENCY = parseInt(process.argv[4] || process.env.BENCHMARK_CONCURRENCY || '20', 10);

function makeRequest(targetUrl) {
  return new Promise((resolve) => {
    const start = process.hrtime();
    const parsedUrl = url.parse(targetUrl);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path,
      method: 'GET',
      agent: false, // Avoid socket pool limits
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const diff = process.hrtime(start);
        const durationMs = diff[0] * 1000 + diff[1] / 1000000;
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          durationMs,
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', (err) => {
      const diff = process.hrtime(start);
      const durationMs = diff[0] * 1000 + diff[1] / 1000000;
      resolve({
        success: false,
        durationMs,
        error: err.message,
      });
    });

    req.end();
  });
}

async function runBenchmark() {
  console.log(`Starting benchmark against ${TARGET_URL}...`);
  console.log(`Configured: Total Requests = ${TOTAL_REQUESTS}, Concurrency = ${CONCURRENCY}`);

  let completedRequests = 0;
  let startedRequests = 0;
  const latencies = [];
  let successCount = 0;
  let failureCount = 0;
  const errors = {};

  const startTime = process.hrtime();

  const worker = async () => {
    while (startedRequests < TOTAL_REQUESTS) {
      startedRequests++;
      const result = await makeRequest(TARGET_URL);
      completedRequests++;
      latencies.push(result.durationMs);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        const errKey = result.error || `HTTP ${result.statusCode}`;
        errors[errKey] = (errors[errKey] || 0) + 1;
      }

      // Log progress occasionally
      if (completedRequests % Math.floor(TOTAL_REQUESTS / 10 || 1) === 0) {
        process.stdout.write(`Progress: ${completedRequests}/${TOTAL_REQUESTS} completed...\r`);
      }
    }
  };

  // Spawn concurrent workers
  const workers = Array(CONCURRENCY).fill(null).map(worker);
  await Promise.all(workers);

  const totalDiff = process.hrtime(startTime);
  const totalDurationSec = totalDiff[0] + totalDiff[1] / 1000000000;

  latencies.sort((a, b) => a - b);

  const avg = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p90 = latencies[Math.floor(latencies.length * 0.9)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const rps = (totalRequestsCount) => totalRequestsCount / totalDurationSec;

  console.log(`\n==================================================`);
  console.log(`🔥 BENCHMARK REPORT: ${TARGET_URL}`);
  console.log(`==================================================`);
  console.log(`Concurrency:          ${CONCURRENCY}`);
  console.log(`Total Requests:       ${TOTAL_REQUESTS}`);
  console.log(`Total Duration:       ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`Throughput (RPS):     ${rps(TOTAL_REQUESTS).toFixed(2)} req/sec`);
  console.log(`--------------------------------------------------`);
  console.log(
    `Success Rate:         ${((successCount / TOTAL_REQUESTS) * 100).toFixed(1)}% (${successCount} OK, ${failureCount} Failed)`
  );
  console.log(`--------------------------------------------------`);
  console.log(`Latency Metrics (ms):`);
  console.log(`  Min:                ${latencies[0].toFixed(2)} ms`);
  console.log(`  Average:            ${avg.toFixed(2)} ms`);
  console.log(`  p50 (Median):       ${p50.toFixed(2)} ms`);
  console.log(`  p90:                ${p90.toFixed(2)} ms`);
  console.log(`  p99:                ${p99.toFixed(2)} ms`);
  console.log(`  Max:                ${latencies[latencies.length - 1].toFixed(2)} ms`);

  if (Object.keys(errors).length > 0) {
    console.log(`--------------------------------------------------`);
    console.log(`Errors encountered:`);
    for (const [err, count] of Object.entries(errors)) {
      console.log(`  ${err}: ${count} occurrences`);
    }
  }
  console.log(`==================================================\n`);
}

runBenchmark().catch((err) => console.error('Benchmark failed:', err));
