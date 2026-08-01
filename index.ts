function listSwaps(a: readonly number[], count: number) {
  const result: number[][] = [];
  const stack: [{swaps: number[], index: number, count: number}] = [{ swaps: [], index: 0, count }];
  while (stack.length > 0) {
    const { swaps, index, count } = stack.pop()!;
    if (index === a.length) {
      result.push(swaps);
      continue;
    }
    for (let i = 0; i <= Math.min(a[index], count); i++) {
      stack.push({ swaps: [...swaps, i], index: index + 1, count: count - i });
    }
  }
  return result;
}

const factorial = (n: number): number =>
  n <= 1 ? 1 : n * factorial(n - 1);

function listCombinations(n: number) {
  const result: number[][] = [];
  const stack: [{freqs: number[], count: number}] = [{ freqs: [], count: n }];
  while (stack.length > 0) {
    const { freqs, count } = stack.pop()!;
    if (freqs.length === 6) {
      result.push(freqs);
      continue;
    }
    if (freqs.length === 5) {
      stack.push({ freqs: [...freqs, count], count: 0 });
      continue;
    }
    for (let i = 0; i <= count; i++) {
      stack.push({ freqs: [...freqs, i], count: count - i });
    }
  }
  return result;
}

function scoreRoll(freqs: number[]) {
  // todo: actual scoring
  let score = 0;
  for (let i = 0; i < freqs.length; i++) {
    score += freqs[i] * (i + 1);
  }
  return score;
}

function getSwapOutcome( expectations: Map<string, number>, step: number, freqs: number[], swaps: number[] ): number {
  const swapCount = swaps.reduce((acc, s) => acc + s, 0);
  const remaining = freqs.map((f, i) => f - swaps[i]);
  const combs = listCombinations(swapCount); 
  let totalCount = 0;
  let totalScore = 0;
  for (const freqs of combs) {
    const count = factorial(swapCount) / swaps.reduce((acc, f) => acc * factorial(f), 1);
    const outcome = remaining.map((r, i) => r + freqs[i]);
    const key = `${step-1}:${outcome.join("")}`;
    if (!expectations.has(key)) throw new Error(`Missing expectation for key: ${key}`);
    const score = expectations.get(key) || 0;
    totalCount += count;
    totalScore += score * count;
  }
  const expectedScore = totalScore / totalCount;
  return expectedScore;
}


function getBestSwap(expectations: Map<string, number>, freqs: number[], step: number) {
  const swaps = listSwaps(freqs, 5);
  let bestScore = -Infinity;
  for (const swap of swaps) {
    const score = getSwapOutcome(expectations, step, freqs, swap);
    if (score > bestScore) {
      bestScore = score;
    }
  }
  return bestScore;
}


function compute() {
  const expectations: Map<string, number> = new Map();
  const allCombs = listCombinations(5);
  let sum = 0;

  for (let i = 0; i <= 2; i++) {
    for (const freqs of allCombs) {
      const key = freqs.join("");
      const expectedScore = i === 0 ? scoreRoll(freqs) : getBestSwap(expectations, freqs, i);
      expectations.set(`${i}:${key}`, expectedScore);
      if (i === 2) {
        sum += expectedScore;
      }
    }
  }

  const avg = sum / allCombs.length;
  console.log("Average expected score after 2 swaps:", avg);
}


compute()



