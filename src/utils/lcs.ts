/**
 * Return the length of Longest Common Subsequence (LCS) between strings s1
 * and s2.
 * Inspired by https://github.com/tdebatty/java-string-similarity/blob/1afdc76eef523b144c73be3c3fc7df88f93fe9b7/src/main/java/info/debatty/java/stringsimilarity/LongestCommonSubsequence.java
 * @param {string} s1
 * @param {string} s2
 * @return {number} Length of the LCS
 */
export const lcsLength = (s1: string, s2: string) => {
  const s1_length = s1.length;
  const s2_length = s2.length;
  const x = s1.split('');
  const y = s2.split('');
  // init array
  const c = Array(s1_length + 1).fill(Array(s2_length + 1).fill(0));

  for (let i = 1; i <= s1_length; i += 1) {
    for (let j = 1; j <= s2_length; j += 1) {
      c[i][j] = x[i - 1] === y[j - 1] ? c[i - 1][j - 1] + 1 : Math.max(c[i][j - 1], c[i - 1][j]);
    }
  }
  return c[s1_length][s2_length];
};
