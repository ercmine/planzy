import '../perbug_puzzle_framework.dart';
import 'pattern_recall_models.dart';

class PatternRecallValidator implements PuzzleValidator<PatternRecallInstance> {
  const PatternRecallValidator();

  @override
  PuzzleResult validate({
    required PatternRecallInstance instance,
    required List<int> input,
    required Duration elapsed,
  }) {
    final expected = instance.expectedAnswer;
    var mistakes = 0;
    for (var i = 0; i < expected.length && i < input.length; i += 1) {
      if (expected[i] != input[i]) mistakes += 1;
    }

    if (input.length < expected.length) {
      mistakes += expected.length - input.length;
    }

    final success = mistakes <= instance.knobs.errorTolerance && input.length >= expected.length;
    return PuzzleResult(
      success: success,
      mistakes: mistakes,
      elapsed: elapsed,
      analytics: {
        'expected_length': expected.length,
        'input_length': input.length,
        'tolerance': instance.knobs.errorTolerance,
        'mirrored': instance.isMirrored,
        'reversed': instance.isReversed,
      },
    );
  }
}
