export const combinationNumbers: number[] = []
export const combinationCounts: number[] = []

const factorial = (n: number): number =>
  n <= 1 ? 1 : n * factorial(n - 1);

function listCombinations(n: number) {
  const result: number[][] = [];
  const stack: [{ freqs: number[], count: number }] = [{ freqs: [], count: n }];
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

export function getCombinationNumbersRange(n: number): [number, number] {
  if (n < 0 || n > 5) throw new Error("n must be between 0 and 5");
  if (combinationNumbers.length === 0) {
    generateCombinationNumbers();
  }
  const ranges = [0, 1, 7, 28, 84, 210, 462];
  return [ranges[n], ranges[n + 1]];
}

function generateCombinationNumbers() {
  for (let i = 0; i <= 5; i++) {
    const combinations = listCombinations(i);
    for (const combo of combinations) {
      combinationNumbers.push(arrayToNumber(combo));
      combinationCounts.push(generateCombinationCounts(combo));
    }
  }
}

function generateCombinationCounts(arr: number[]) {
  const total = arr.reduce((acc, f) => acc + f, 0);
  return factorial(total) / arr.reduce((acc, f) => acc * factorial(f), 1);
}


export function arrayToNumber(arr: number[]): number {
  if (arr.length !== 6) throw new Error("Array must have length 6");
  return arr[0]
    | arr[1] << 3
    | arr[2] << 6
    | arr[3] << 9
    | arr[4] << 12
    | arr[5] << 15;
}

export function numberToArray(num: number): number[] {
  return [
    num & 7,
    (num >> 3) & 7,
    (num >> 6) & 7,
    (num >> 9) & 7,
    (num >> 12) & 7,
    (num >> 15) & 7,
  ];
}

export function numberSize(num: number): number {
  return (num & 7) +
    ((num >> 3) & 7) +
    ((num >> 6) & 7) +
    ((num >> 9) & 7) +
    ((num >> 12) & 7) +
    ((num >> 15) & 7);
}
