// Standard 75-ball bingo win check: any single row, column, or
// diagonal (the "any line" ruleset chosen for this platform - the
// center cell at index 12 is a free space and always counts as
// marked). grid is a 25-element array in row-major order.

const LINES = [
  // rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

/**
 * Returns the winning pattern name if this card is complete against
 * the given set of called numbers, otherwise null.
 * @param {number[]} grid - 25 cells, row-major, center (index 12) is 0 (free)
 * @param {number[]} calledNumbers
 */
function checkWin(grid, calledNumbers) {
  const called = new Set(calledNumbers);

  for (const line of LINES) {
    const complete = line.every((idx) => {
      const val = grid[idx];
      return val === 0 || called.has(val);
    });
    if (complete) {
      return describeLineName(line);
    }
  }
  return null;
}

function describeLineName([a, , c, , e]) {
  if (a === 0 && c === 12 && e === 24) return 'diagonal';
  if (a === 4 && c === 12 && e === 20) return 'diagonal';
  if (a % 5 === 0 && c - a === 10) return 'column';
  if (Math.floor(a / 5) === Math.floor(c / 5)) return 'row';
  return 'line';
}

module.exports = { checkWin, LINES };
