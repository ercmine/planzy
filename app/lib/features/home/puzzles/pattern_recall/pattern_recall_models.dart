import '../perbug_puzzle_framework.dart';

enum PatternRecallPhase { briefing, preview, recall, success, failure, abandoned }

class PatternRecallDifficultyKnobs {
  const PatternRecallDifficultyKnobs({
    required this.sequenceLength,
    required this.symbolVariety,
    required this.previewDurationMs,
    required this.distractionCount,
    required this.mirroredChance,
    required this.errorTolerance,
  });

  final int sequenceLength;
  final int symbolVariety;
  final int previewDurationMs;
  final int distractionCount;
  final double mirroredChance;
  final int errorTolerance;
}

class PatternRecallDistraction {
  const PatternRecallDistraction({
    required this.step,
    required this.symbolIndex,
  });

  final int step;
  final int symbolIndex;
}

class PatternRecallInstance extends PuzzleInstance {
  PatternRecallInstance({
    required this.seedInput,
    required this.difficulty,
    required this.knobs,
    required this.symbolSet,
    required this.generatedSequence,
    required this.expectedAnswer,
    required this.previewStepDuration,
    required this.isMirrored,
    required this.isReversed,
    required this.distractions,
    required this.debug,
  });

  @override
  final PuzzleSeedInput seedInput;

  @override
  final PuzzleDifficulty difficulty;

  final PatternRecallDifficultyKnobs knobs;
  final List<String> symbolSet;
  final List<int> generatedSequence;
  final List<int> expectedAnswer;
  final Duration previewStepDuration;
  final bool isMirrored;
  final bool isReversed;
  final List<PatternRecallDistraction> distractions;
  final Map<String, Object> debug;

  @override
  PuzzleType get type => PuzzleType.patternRecall;

  @override
  Map<String, Object> debugMetadata() => debug;
}

class PatternRecallSession {
  const PatternRecallSession({
    required this.instance,
    required this.phase,
    required this.currentPreviewStep,
    required this.input,
    required this.startedAt,
    required this.retries,
    required this.mistakes,
    required this.lifecycle,
    this.completedAt,
  });

  final PatternRecallInstance instance;
  final PatternRecallPhase phase;
  final int currentPreviewStep;
  final List<int> input;
  final DateTime startedAt;
  final DateTime? completedAt;
  final int retries;
  final int mistakes;
  final List<PuzzleLifecycleEvent> lifecycle;

  PatternRecallSession copyWith({
    PatternRecallPhase? phase,
    int? currentPreviewStep,
    List<int>? input,
    DateTime? startedAt,
    DateTime? completedAt,
    bool clearCompletedAt = false,
    int? retries,
    int? mistakes,
    List<PuzzleLifecycleEvent>? lifecycle,
  }) {
    return PatternRecallSession(
      instance: instance,
      phase: phase ?? this.phase,
      currentPreviewStep: currentPreviewStep ?? this.currentPreviewStep,
      input: input ?? this.input,
      startedAt: startedAt ?? this.startedAt,
      completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
      retries: retries ?? this.retries,
      mistakes: mistakes ?? this.mistakes,
      lifecycle: lifecycle ?? this.lifecycle,
    );
  }
}

extension PatternRecallPhaseX on PatternRecallPhase {
  bool get isTerminal =>
      this == PatternRecallPhase.success || this == PatternRecallPhase.failure || this == PatternRecallPhase.abandoned;
}
