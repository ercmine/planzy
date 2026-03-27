import 'dart:math';

import 'puzzle_framework.dart';

enum WordWeaveDictionaryStrictness {
  exactTargetOnly,
  targetSetOnly,
  standardDictionary,
  relaxedDictionary,
}

class WordWeaveDifficultyConfig {
  const WordWeaveDifficultyConfig({
    required this.letterPoolSize,
    required this.targetWordLength,
    required this.decoyDensity,
    required this.branchingOptions,
    required this.retryAllowance,
    required this.dictionaryStrictness,
  });

  final int letterPoolSize;
  final int targetWordLength;
  final double decoyDensity;
  final int branchingOptions;
  final int retryAllowance;
  final WordWeaveDictionaryStrictness dictionaryStrictness;
}

class WordWeaveBoard {
  const WordWeaveBoard({
    required this.letterPool,
    required this.branchPreview,
    required this.targetLength,
  });

  final List<String> letterPool;
  final List<List<String>> branchPreview;
  final int targetLength;
}

class WordWeaveSolution {
  const WordWeaveSolution({required this.primaryTarget, required this.validTargets});

  final String primaryTarget;
  final Set<String> validTargets;
}

abstract class WordDictionary {
  bool isValidWord(String value, WordWeaveDictionaryStrictness strictness);

  List<String> wordsForLength(int length);
}

class BuiltinWordDictionary implements WordDictionary {
  BuiltinWordDictionary({Set<String>? words}) : _words = (words ?? _defaultWords).map((w) => w.toUpperCase()).toSet();

  final Set<String> _words;

  @override
  bool isValidWord(String value, WordWeaveDictionaryStrictness strictness) {
    final upper = value.toUpperCase();
    switch (strictness) {
      case WordWeaveDictionaryStrictness.standardDictionary:
        return _words.contains(upper);
      case WordWeaveDictionaryStrictness.relaxedDictionary:
        return upper.length >= 3 && _words.any((candidate) => candidate.startsWith(upper.substring(0, 2)));
      default:
        return _words.contains(upper);
    }
  }

  @override
  List<String> wordsForLength(int length) {
    return _words.where((word) => word.length == length).toList()..sort();
  }

  static const Set<String> _defaultWords = {
    'APPLE',
    'BRAIN',
    'BRAVE',
    'BRICK',
    'CABLE',
    'CLOUD',
    'CRANE',
    'EARTH',
    'EMBER',
    'FLAME',
    'GLASS',
    'GRAPE',
    'HOUSE',
    'LIGHT',
    'MANGO',
    'NIGHT',
    'OCEAN',
    'PEARL',
    'PLANT',
    'QUEST',
    'RIVER',
    'SHINE',
    'STONE',
    'STORM',
    'TABLE',
    'TRAIN',
    'UNITY',
    'VOICE',
    'WATER',
    'WORLD',
  };
}

class WordWeaveGenerator extends PuzzleGenerator<WordWeaveDifficultyConfig, WordWeaveBoard, WordWeaveSolution> {
  WordWeaveGenerator({WordDictionary? dictionary}) : _dictionary = dictionary ?? BuiltinWordDictionary();

  final WordDictionary _dictionary;

  @override
  PuzzleInstance<WordWeaveBoard, WordWeaveSolution> generate({required PuzzleSeedInput seed, required WordWeaveDifficultyConfig config}) {
    final normalizedLength = config.targetWordLength.clamp(4, 7);
    final candidates = _dictionary.wordsForLength(normalizedLength);
    if (candidates.isEmpty) {
      throw StateError('WordWeave dictionary has no words for length $normalizedLength');
    }

    final rng = Random(seed.toDeterministicSeed());
    final target = candidates[rng.nextInt(candidates.length)];
    final decoyCount = ((config.letterPoolSize * config.decoyDensity).round()).clamp(0, config.letterPoolSize - target.length);

    final letters = target.split('');
    final alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    final decoys = <String>[];
    while (decoys.length < decoyCount) {
      final candidate = alphabet[rng.nextInt(alphabet.length)];
      if (letters.contains(candidate) && rng.nextBool()) continue;
      decoys.add(candidate);
    }

    final pool = [...letters, ...decoys];
    while (pool.length < config.letterPoolSize) {
      pool.add(alphabet[rng.nextInt(alphabet.length)]);
    }
    pool.shuffle(rng);

    final branchPreview = <List<String>>[];
    final perStepOptions = max(1, config.branchingOptions);
    for (var i = 0; i < target.length; i++) {
      final options = <String>{target[i]};
      while (options.length < perStepOptions) {
        options.add(pool[rng.nextInt(pool.length)]);
      }
      final line = options.toList()..shuffle(rng);
      branchPreview.add(line);
    }

    final difficulty = computeWordWeaveDifficulty(config);
    final instanceId = '${seed.nodeId}-word-weave-${seed.toDeterministicSeed()}';

    return PuzzleInstance(
      id: instanceId,
      type: PuzzleType.wordWeave,
      seed: seed,
      difficulty: difficulty,
      board: WordWeaveBoard(letterPool: pool, branchPreview: branchPreview, targetLength: target.length),
      solution: WordWeaveSolution(primaryTarget: target, validTargets: {target}),
      debug: {
        'targetWords': [target],
        'letterPool': pool,
        'decoyCount': decoyCount,
        'branchPreview': branchPreview,
        'dictionaryStrictness': config.dictionaryStrictness.name,
        'difficultyExplainer': difficulty.explainer,
      },
    );
  }
}

PuzzleDifficulty computeWordWeaveDifficulty(WordWeaveDifficultyConfig config) {
  final strictnessWeight = switch (config.dictionaryStrictness) {
    WordWeaveDictionaryStrictness.exactTargetOnly => 0.8,
    WordWeaveDictionaryStrictness.targetSetOnly => 1.0,
    WordWeaveDictionaryStrictness.standardDictionary => 1.25,
    WordWeaveDictionaryStrictness.relaxedDictionary => 1.1,
  };

  final contributions = <String, double>{
    'letterPoolSize': config.letterPoolSize / 10,
    'targetWordLength': config.targetWordLength / 4,
    'decoyDensity': config.decoyDensity * 2,
    'branchingOptions': config.branchingOptions / 3,
    'retryAllowance': max(0, 3 - config.retryAllowance) / 2,
    'dictionaryStrictness': strictnessWeight,
  };

  final score = contributions.values.fold<double>(0, (sum, value) => sum + value);
  final tier = score < 5
      ? 'Easy'
      : score < 7
          ? 'Medium'
          : score < 9
              ? 'Hard'
              : 'Expert';

  return PuzzleDifficulty(
    score: score,
    tier: tier,
    explainer: contributions,
    knobs: {
      'letterPoolSize': config.letterPoolSize,
      'targetWordLength': config.targetWordLength,
      'decoyDensity': config.decoyDensity,
      'branchingOptions': config.branchingOptions,
      'retryAllowance': config.retryAllowance,
      'dictionaryStrictness': config.dictionaryStrictness.name,
    },
  );
}

class WordWeaveValidator extends PuzzleValidator<WordWeaveBoard, WordWeaveSolution, String> {
  WordWeaveValidator({WordDictionary? dictionary}) : _dictionary = dictionary ?? BuiltinWordDictionary();

  final WordDictionary _dictionary;

  PuzzleResult validateSubmission({
    required WordWeaveBoard board,
    required WordWeaveSolution solution,
    required String input,
    required WordWeaveDifficultyConfig config,
  }) {
    final candidate = input.trim().toUpperCase();
    if (candidate.isEmpty) {
      return const PuzzleResult(success: false, reason: 'Empty submission', metadata: {'kind': 'empty'});
    }
    if (!_canAssembleFromPool(candidate, board.letterPool)) {
      return const PuzzleResult(success: false, reason: 'Submission uses unavailable letters', metadata: {'kind': 'invalid_letters'});
    }
    final isTarget = solution.validTargets.contains(candidate);
    if (isTarget) {
      return PuzzleResult(success: true, reason: 'Solved', metadata: {'kind': 'target', 'word': candidate});
    }

    switch (config.dictionaryStrictness) {
      case WordWeaveDictionaryStrictness.exactTargetOnly:
      case WordWeaveDictionaryStrictness.targetSetOnly:
        return const PuzzleResult(success: false, reason: 'Word is not a target', metadata: {'kind': 'not_target'});
      case WordWeaveDictionaryStrictness.standardDictionary:
      case WordWeaveDictionaryStrictness.relaxedDictionary:
        final validDictionaryWord = _dictionary.isValidWord(candidate, config.dictionaryStrictness);
        return validDictionaryWord
            ? PuzzleResult(success: false, reason: 'Valid word but not a target', metadata: {'kind': 'valid_non_target', 'word': candidate})
            : const PuzzleResult(success: false, reason: 'Not in dictionary', metadata: {'kind': 'dictionary_reject'});
    }
  }

  @override
  PuzzleResult validate({required WordWeaveBoard board, required WordWeaveSolution solution, required String input}) {
    return PuzzleResult(
      success: solution.validTargets.contains(input.trim().toUpperCase()),
      reason: 'Direct validation',
      metadata: {'word': input.trim().toUpperCase()},
    );
  }

  bool _canAssembleFromPool(String word, List<String> pool) {
    final poolCounts = <String, int>{};
    for (final letter in pool) {
      poolCounts[letter] = (poolCounts[letter] ?? 0) + 1;
    }
    for (final letter in word.split('')) {
      final count = poolCounts[letter] ?? 0;
      if (count <= 0) return false;
      poolCounts[letter] = count - 1;
    }
    return true;
  }
}

class WordWeaveSession extends PuzzleSession<WordWeaveBoard, WordWeaveSolution, String> {
  const WordWeaveSession({
    required super.instance,
    required super.status,
    required super.startedAt,
    required super.attemptsUsed,
    required super.maxRetries,
    required super.currentInput,
    required super.invalidSubmissions,
    required super.lifecycleEvents,
    required this.config,
  });

  final WordWeaveDifficultyConfig config;

  WordWeaveSession copyWith({
    PuzzleSessionStatus? status,
    DateTime? startedAt,
    int? attemptsUsed,
    int? maxRetries,
    String? currentInput,
    List<String>? invalidSubmissions,
    List<PuzzleLifecycleEvent>? lifecycleEvents,
    WordWeaveDifficultyConfig? config,
  }) {
    return WordWeaveSession(
      instance: instance,
      status: status ?? this.status,
      startedAt: startedAt ?? this.startedAt,
      attemptsUsed: attemptsUsed ?? this.attemptsUsed,
      maxRetries: maxRetries ?? this.maxRetries,
      currentInput: currentInput ?? this.currentInput,
      invalidSubmissions: invalidSubmissions ?? this.invalidSubmissions,
      lifecycleEvents: lifecycleEvents ?? this.lifecycleEvents,
      config: config ?? this.config,
    );
  }
}

WordWeaveSession createWordWeaveSession({
  required PuzzleSeedInput seed,
  required WordWeaveDifficultyConfig config,
  WordWeaveGenerator? generator,
}) {
  final resolvedGenerator = generator ?? WordWeaveGenerator();
  final instance = resolvedGenerator.generate(seed: seed, config: config);
  final now = DateTime.now();
  return WordWeaveSession(
    instance: instance,
    status: PuzzleSessionStatus.generated,
    startedAt: null,
    attemptsUsed: 0,
    maxRetries: config.retryAllowance,
    currentInput: '',
    invalidSubmissions: const [],
    lifecycleEvents: [
      PuzzleLifecycleEvent(name: 'puzzle_generated', at: now, metadata: {'nodeId': seed.nodeId, 'type': PuzzleType.wordWeave.name}),
    ],
    config: config,
  );
}
