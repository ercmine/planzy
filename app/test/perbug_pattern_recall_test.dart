import 'package:dryad/features/home/perbug_game_controller.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:dryad/features/home/puzzles/pattern_recall/pattern_recall_generator.dart';
import 'package:dryad/features/home/puzzles/pattern_recall/pattern_recall_models.dart';
import 'package:dryad/features/home/puzzles/pattern_recall/pattern_recall_validator.dart';
import 'package:dryad/features/home/puzzles/perbug_puzzle_framework.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const nodeA = PerbugNode(
    id: 'node-a',
    label: 'Node A',
    latitude: 30.2672,
    longitude: -97.7431,
    region: 'Downtown',
    state: PerbugNodeState.available,
    energyReward: 2,
  );
  const nodeB = PerbugNode(
    id: 'node-b',
    label: 'Node B',
    latitude: 30.271,
    longitude: -97.75,
    region: 'North',
    state: PerbugNodeState.available,
    energyReward: 2,
  );

  test('pattern generation is deterministic for same node lat/lng seed', () {
    const generator = PatternRecallGenerator();
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);

    final first = generator.generate(node: nodeA, seedInput: seed, tuning: const {});
    final second = generator.generate(node: nodeA, seedInput: seed, tuning: const {});

    expect(first.generatedSequence, second.generatedSequence);
    expect(first.expectedAnswer, second.expectedAnswer);
    expect(first.distractions.map((d) => '${d.step}:${d.symbolIndex}').toList(),
        second.distractions.map((d) => '${d.step}:${d.symbolIndex}').toList());
  });

  test('different nodes generate different sequence patterns', () {
    const generator = PatternRecallGenerator();
    const seedA = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    const seedB = PuzzleSeedInput(nodeId: 'node-b', latitude: 30.271, longitude: -97.75);

    final first = generator.generate(node: nodeA, seedInput: seedA, tuning: const {});
    final second = generator.generate(node: nodeB, seedInput: seedB, tuning: const {});

    expect(first.generatedSequence, isNot(second.generatedSequence));
  });

  test('difficulty responds to tuning knobs/progression boosts', () {
    const generator = PatternRecallGenerator();
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);

    final easy = generator.generate(node: nodeA, seedInput: seed, tuning: const {'progressionStage': 0.0, 'rarityBoost': 0.0});
    final hard = generator.generate(node: nodeA, seedInput: seed, tuning: const {'progressionStage': 1.6, 'rarityBoost': 0.8});

    expect(hard.difficulty.score, greaterThan(easy.difficulty.score));
    expect(hard.knobs.sequenceLength, greaterThanOrEqualTo(easy.knobs.sequenceLength));
    expect(hard.knobs.previewDurationMs, lessThanOrEqualTo(easy.knobs.previewDurationMs));
  });

  test('validator respects tolerance mode', () {
    const validator = PatternRecallValidator();
    final instance = PatternRecallInstance(
      seedInput: const PuzzleSeedInput(nodeId: 'n', latitude: 1, longitude: 1),
      difficulty: const PuzzleDifficulty(score: 10, tier: 'Easy', explainer: {}),
      knobs: const PatternRecallDifficultyKnobs(
        sequenceLength: 4,
        symbolVariety: 4,
        previewDurationMs: 3000,
        distractionCount: 0,
        mirroredChance: 0.0,
        errorTolerance: 1,
      ),
      symbolSet: const ['A', 'B', 'C', 'D'],
      generatedSequence: const [0, 1, 2, 3],
      expectedAnswer: const [0, 1, 2, 3],
      previewStepDuration: const Duration(milliseconds: 800),
      isMirrored: false,
      isReversed: false,
      distractions: const [],
      debug: const {},
    );

    final pass = validator.validate(instance: instance, input: const [0, 1, 3, 3], elapsed: const Duration(seconds: 3));
    final fail = validator.validate(instance: instance, input: const [2, 1, 3, 0], elapsed: const Duration(seconds: 3));

    expect(pass.success, isTrue);
    expect(fail.success, isFalse);
  });

  test('controller blocks input before preview completion and records lifecycle', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final notifier = container.read(perbugGameControllerProvider.notifier);
    notifier.state = const PerbugGameState(
      nodes: [nodeA],
      currentNodeId: 'node-a',
      energy: 10,
      maxEnergy: 20,
      maxJumpMeters: 2000,
      loading: false,
      visitedNodeIds: {'node-a'},
      history: [],
      puzzleEvents: [],
    );

    notifier.launchPatternRecallForCurrentNode();
    final before = notifier.state.activePatternRecall!;
    notifier.inputPatternSymbol(0);
    expect(notifier.state.activePatternRecall!.input, before.input);

    notifier.startPatternPreview();
    notifier.completePatternPreview();
    final expected = notifier.state.activePatternRecall!.instance.expectedAnswer;
    for (final value in expected) {
      notifier.inputPatternSymbol(value);
    }

    expect(notifier.state.activePatternRecall!.phase, PatternRecallPhase.success);
    expect(notifier.state.puzzleEvents.where((e) => e['name'] == 'preview_completed').isNotEmpty, isTrue);
    expect(notifier.state.puzzleEvents.where((e) => e['name'] == 'puzzle_succeeded').isNotEmpty, isTrue);
  });
}
