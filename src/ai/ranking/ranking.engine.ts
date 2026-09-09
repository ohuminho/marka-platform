export interface RankingInput {
  popularity: number;
  distance: number;
  trust: number;
}

export function calculateScore(input: RankingInput) {
  return (
    input.popularity * 0.4 +
    input.trust * 0.4 -
    input.distance * 0.2
  );
}
