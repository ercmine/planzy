import 'perbug_puzzle_framework.dart';

enum SymbolShape { circle, triangle, square, diamond, hexagon, star }
enum SymbolColorFamily { ember, ocean, moss, dusk, sun, violet }
enum SymbolMark { dot, line, ring, cross }

enum SymbolRuleKind {
  sameShape,
  sameColor,
  sameMark,
  sameShapeDifferentColor,
  sameColorDifferentMark,
  sharedOneTraitOnly,
}

class SymbolMatchDifficultyKnobs {
  const SymbolMatchDifficultyKnobs({
    this.symbolPoolSize = 14,
    this.ruleComplexity = 2,
    this.decoyCount = 3,
    this.rounds = 3,
    this.overlapSimilarity = 0.55,
    this.timerPressure = 0,
  });

  final int symbolPoolSize;
  final int ruleComplexity;
  final int decoyCount;
  final int rounds;
  final double overlapSimilarity;
  final int timerPressure;
}

class PerbugSymbol {
  const PerbugSymbol({
    required this.id,
    required this.shape,
    required this.color,
    required this.mark,
    required this.rotationQuarterTurns,
  });

  final String id;
  final SymbolShape shape;
  final SymbolColorFamily color;
  final SymbolMark mark;
  final int rotationQuarterTurns;

  int overlapScoreWith(PerbugSymbol other) {
    var score = 0;
    if (shape == other.shape) score += 2;
    if (color == other.color) score += 2;
    if (mark == other.mark) score += 2;
    if (rotationQuarterTurns == other.rotationQuarterTurns) score += 1;
    return score;
  }
}

class SymbolMatchRule {
  const SymbolMatchRule({
    required this.kind,
    required this.complexityWeight,
    required this.hint,
  });

  final SymbolRuleKind kind;
  final int complexityWeight;
  final String hint;

  bool matches(PerbugSymbol anchor, PerbugSymbol candidate) {
    switch (kind) {
      case SymbolRuleKind.sameShape:
        return anchor.shape == candidate.shape;
      case SymbolRuleKind.sameColor:
        return anchor.color == candidate.color;
      case SymbolRuleKind.sameMark:
        return anchor.mark == candidate.mark;
      case SymbolRuleKind.sameShapeDifferentColor:
        return anchor.shape == candidate.shape && anchor.color != candidate.color;
      case SymbolRuleKind.sameColorDifferentMark:
        return anchor.color == candidate.color && anchor.mark != candidate.mark;
      case SymbolRuleKind.sharedOneTraitOnly:
        final matches = <bool>[
          anchor.shape == candidate.shape,
          anchor.color == candidate.color,
          anchor.mark == candidate.mark,
        ];
        return matches.where((it) => it).length == 1;
    }
  }

  String get debugDescription => kind.name;
}

class SymbolMatchRound {
  const SymbolMatchRound({
    required this.index,
    required this.anchorSymbol,
    required this.candidates,
    required this.correctCandidateIndex,
    required this.rule,
    required this.partialHint,
    required this.timerSeconds,
    required this.decoyDebug,
  });

  final int index;
  final PerbugSymbol anchorSymbol;
  final List<PerbugSymbol> candidates;
  final int correctCandidateIndex;
  final SymbolMatchRule rule;
  final String partialHint;
  final int timerSeconds;
  final List<String> decoyDebug;
}

class SymbolMatchPuzzleInstance extends PuzzleInstance {
  const SymbolMatchPuzzleInstance({
    required super.id,
    required super.seedInput,
    required super.difficulty,
    required this.knobs,
    required this.symbolPool,
    required this.rounds,
    required this.debugMetadata,
  }) : super(type: PuzzleType.symbolMatch);

  final SymbolMatchDifficultyKnobs knobs;
  final List<PerbugSymbol> symbolPool;
  final List<SymbolMatchRound> rounds;
  final Map<String, Object> debugMetadata;
}

class SymbolMatchGenerator {
  const SymbolMatchGenerator();

  SymbolMatchPuzzleInstance generate({
    required PuzzleSeedInput seedInput,
    required SymbolMatchDifficultyKnobs knobs,
  }) {
    final seed = seedInput.toSeed();
    final rng = DeterministicRng(seed);
    final difficulty = _computeDifficulty(knobs);
    final pool = _buildPool(rng, knobs.symbolPoolSize);
    final rounds = <SymbolMatchRound>[];

    for (var i = 0; i < knobs.rounds; i++) {
      rounds.add(_buildRound(rng: rng, roundIndex: i, pool: pool, knobs: knobs));
    }

    return SymbolMatchPuzzleInstance(
      id: 'SM-${deterministicIdFromSeed(PuzzleType.symbolMatch, seed)}',
      seedInput: seedInput,
      difficulty: difficulty,
      knobs: knobs,
      symbolPool: pool,
      rounds: rounds,
      debugMetadata: {
        'seed': seed,
        'symbolPoolSize': pool.length,
        'ruleKinds': rounds.map((r) => r.rule.debugDescription).toList(growable: false),
        'answers': rounds.map((r) => r.correctCandidateIndex).toList(growable: false),
      },
    );
  }

  PuzzleDifficulty _computeDifficulty(SymbolMatchDifficultyKnobs knobs) {
    final pool = normalizedScore(knobs.symbolPoolSize.toDouble(), 8, 24);
    final complexity = normalizedScore(knobs.ruleComplexity.toDouble(), 1, 5);
    final decoys = normalizedScore(knobs.decoyCount.toDouble(), 1, 5);
    final rounds = normalizedScore(knobs.rounds.toDouble(), 1, 6);
    final overlap = normalizedScore(knobs.overlapSimilarity, 0.1, 0.95);
    final timer = normalizedScore(knobs.timerPressure.toDouble(), 0, 10);

    final explainers = <String, double>{
      'symbolPoolSize': pool,
      'ruleComplexity': complexity,
      'decoyCount': decoys,
      'rounds': rounds,
      'overlapSimilarity': overlap,
      'timerPressure': timer,
    };

    final score = (
      pool * 0.18 +
      complexity * 0.24 +
      decoys * 0.16 +
      rounds * 0.18 +
      overlap * 0.14 +
      timer * 0.10
    ).clamp(0.0, 1.0);

    return PuzzleDifficulty(score: score, tier: tierFromScore(score), explainers: explainers);
  }

  List<PerbugSymbol> _buildPool(DeterministicRng rng, int size) {
    final all = <PerbugSymbol>[];
    for (final shape in SymbolShape.values) {
      for (final color in SymbolColorFamily.values) {
        for (final mark in SymbolMark.values) {
          final rotationQuarterTurns = (shape.index + color.index + mark.index) % 4;
          all.add(
            PerbugSymbol(
              id: '${shape.name}-${color.name}-${mark.name}-$rotationQuarterTurns',
              shape: shape,
              color: color,
              mark: mark,
              rotationQuarterTurns: rotationQuarterTurns,
            ),
          );
        }
      }
    }

    all.sort((a, b) => a.id.compareTo(b.id));
    final shuffled = rng.shuffled(all);
    return shuffled.take(boundInt(size, 8, all.length)).toList(growable: false);
  }

  SymbolMatchRound _buildRound({
    required DeterministicRng rng,
    required int roundIndex,
    required List<PerbugSymbol> pool,
    required SymbolMatchDifficultyKnobs knobs,
  }) {
    final allowedRules = _allowedRules(knobs.ruleComplexity);

    for (var attempt = 0; attempt < 30; attempt++) {
      final anchor = rng.pick(pool);
      final rule = rng.pick(allowedRules);
      final valid = pool.where((s) => s.id != anchor.id && rule.matches(anchor, s)).toList(growable: false);
      if (valid.isEmpty) continue;

      final correct = rng.pick(valid);
      final decoys = _pickDecoys(rng: rng, pool: pool, anchor: anchor, rule: rule, knobs: knobs);
      if (decoys.length < knobs.decoyCount) continue;

      final candidates = [...decoys.take(knobs.decoyCount), correct];
      final shuffled = rng.shuffled(candidates);
      final correctIndex = shuffled.indexWhere((s) => s.id == correct.id);
      if (correctIndex < 0) continue;
      if (!_isFairRound(anchor: anchor, candidates: shuffled, rule: rule)) continue;

      final hint = _hintFor(rule, knobs.ruleComplexity, rng);
      final timerSeconds = knobs.timerPressure <= 0
          ? 0
          : boundInt(35 - knobs.timerPressure * 2 - roundIndex, 8, 30);

      return SymbolMatchRound(
        index: roundIndex,
        anchorSymbol: anchor,
        candidates: shuffled,
        correctCandidateIndex: correctIndex,
        rule: rule,
        partialHint: hint,
        timerSeconds: timerSeconds,
        decoyDebug: decoys.map((d) => 'decoy:${d.id}|overlap:${anchor.overlapScoreWith(d)}').toList(growable: false),
      );
    }

    throw StateError('Could not generate a fair Symbol Match round.');
  }

  bool _isFairRound({
    required PerbugSymbol anchor,
    required List<PerbugSymbol> candidates,
    required SymbolMatchRule rule,
  }) {
    final matches = candidates.where((candidate) => rule.matches(anchor, candidate)).length;
    return matches == 1;
  }

  List<PerbugSymbol> _pickDecoys({
    required DeterministicRng rng,
    required List<PerbugSymbol> pool,
    required PerbugSymbol anchor,
    required SymbolMatchRule rule,
    required SymbolMatchDifficultyKnobs knobs,
  }) {
    final nonMatches = pool.where((symbol) => symbol.id != anchor.id && !rule.matches(anchor, symbol)).toList();
    nonMatches.sort((a, b) {
      final aScore = anchor.overlapScoreWith(a);
      final bScore = anchor.overlapScoreWith(b);
      return bScore.compareTo(aScore);
    });

    final topSpan = boundInt((nonMatches.length * knobs.overlapSimilarity).round(), knobs.decoyCount, nonMatches.length);
    final preferred = nonMatches.take(topSpan).toList(growable: false);
    return rng.shuffled(preferred);
  }

  List<SymbolMatchRule> _allowedRules(int complexity) {
    final clamped = boundInt(complexity, 1, 5);
    final base = <SymbolMatchRule>[
      const SymbolMatchRule(kind: SymbolRuleKind.sameShape, complexityWeight: 1, hint: 'shape family'),
      const SymbolMatchRule(kind: SymbolRuleKind.sameColor, complexityWeight: 1, hint: 'color family'),
      const SymbolMatchRule(kind: SymbolRuleKind.sameMark, complexityWeight: 1, hint: 'inner mark style'),
      const SymbolMatchRule(kind: SymbolRuleKind.sameShapeDifferentColor, complexityWeight: 2, hint: 'same shell, different hue'),
      const SymbolMatchRule(kind: SymbolRuleKind.sameColorDifferentMark, complexityWeight: 3, hint: 'same hue, mark shifts'),
      const SymbolMatchRule(kind: SymbolRuleKind.sharedOneTraitOnly, complexityWeight: 4, hint: 'exactly one trait is shared'),
    ];
    return base.where((rule) => rule.complexityWeight <= clamped).toList(growable: false);
  }

  String _hintFor(SymbolMatchRule rule, int complexity, DeterministicRng rng) {
    if (complexity <= 1) {
      return 'Hint: match by ${rule.hint}';
    }
    if (complexity <= 3) {
      return rng.nextInt(2) == 0 ? 'Hint: focus on outer silhouette' : 'Hint: not all traits need to match';
    }
    return 'Hidden relation active. Find the one valid counterpart.';
  }
}

bool validateSymbolMatchAnswer({
  required SymbolMatchRound round,
  required int selectedIndex,
}) {
  return selectedIndex == round.correctCandidateIndex;
}
