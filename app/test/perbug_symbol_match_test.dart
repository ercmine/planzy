import 'package:dryad/features/home/puzzles/perbug_puzzle_framework.dart';
import 'package:dryad/features/home/puzzles/perbug_symbol_match.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const generator = SymbolMatchGenerator();

  test('symbol match generation is deterministic for same node lat/lng seed', () {
    const seedInput = PuzzleSeedInput(nodeId: 'node-1', latitude: 30.2672, longitude: -97.7431);
    const knobs = SymbolMatchDifficultyKnobs(symbolPoolSize: 14, ruleComplexity: 3, decoyCount: 3, rounds: 4, overlapSimilarity: 0.7, timerPressure: 3);

    final first = generator.generate(seedInput: seedInput, knobs: knobs);
    final second = generator.generate(seedInput: seedInput, knobs: knobs);

    expect(first.id, second.id);
    expect(first.symbolPool.map((s) => s.id).toList(), second.symbolPool.map((s) => s.id).toList());
    expect(
      first.rounds.map((r) => '${r.anchorSymbol.id}|${r.correctCandidateIndex}|${r.rule.debugDescription}').toList(),
      second.rounds.map((r) => '${r.anchorSymbol.id}|${r.correctCandidateIndex}|${r.rule.debugDescription}').toList(),
    );
  });

  test('different coordinates produce different puzzle ids', () {
    const knobs = SymbolMatchDifficultyKnobs();
    final a = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'same', latitude: 30.2672, longitude: -97.7431),
      knobs: knobs,
    );
    final b = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'same', latitude: 30.2673, longitude: -97.7431),
      knobs: knobs,
    );

    expect(a.id, isNot(equals(b.id)));
  });

  test('difficulty score increases with harder knobs', () {
    final easier = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n', latitude: 1, longitude: 2),
      knobs: const SymbolMatchDifficultyKnobs(symbolPoolSize: 8, ruleComplexity: 1, decoyCount: 1, rounds: 1, overlapSimilarity: 0.1, timerPressure: 0),
    );
    final harder = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n', latitude: 1, longitude: 2),
      knobs: const SymbolMatchDifficultyKnobs(symbolPoolSize: 20, ruleComplexity: 5, decoyCount: 5, rounds: 6, overlapSimilarity: 0.9, timerPressure: 8),
    );

    expect(harder.difficulty.score, greaterThan(easier.difficulty.score));
  });

  test('every generated round has exactly one valid answer', () {
    final puzzle = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'fair', latitude: 40.7, longitude: -74),
      knobs: const SymbolMatchDifficultyKnobs(ruleComplexity: 4, decoyCount: 4, rounds: 5, overlapSimilarity: 0.85),
    );

    for (final round in puzzle.rounds) {
      final matches = round.candidates.where((candidate) => round.rule.matches(round.anchorSymbol, candidate)).length;
      expect(matches, 1, reason: 'Round ${round.index} became ambiguous');
      expect(validateSymbolMatchAnswer(round: round, selectedIndex: round.correctCandidateIndex), isTrue);
    }
  });

  test('timer pressure knob can produce timed rounds', () {
    final untimed = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'timer', latitude: 30, longitude: 31),
      knobs: const SymbolMatchDifficultyKnobs(timerPressure: 0),
    );
    final timed = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'timer', latitude: 30, longitude: 31),
      knobs: const SymbolMatchDifficultyKnobs(timerPressure: 7),
    );

    expect(untimed.rounds.every((r) => r.timerSeconds == 0), isTrue);
    expect(timed.rounds.any((r) => r.timerSeconds > 0), isTrue);
  });
}
