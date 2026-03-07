import 'package:flutter/material.dart';

enum PerbugLogoVariant { markOnly, withWordmark }

class PerbugLogo extends StatelessWidget {
  const PerbugLogo({
    this.size = 48,
    this.variant = PerbugLogoVariant.markOnly,
    this.brightness,
    super.key,
  });

  final double size;
  final PerbugLogoVariant variant;
  final Brightness? brightness;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bright = brightness ?? Theme.of(context).brightness;
    final mark = CustomPaint(
      size: Size.square(size),
      painter: _PerbugLogoPainter(
        primary: scheme.primary,
        secondary: scheme.secondary,
        background: bright == Brightness.dark ? scheme.surfaceContainerHighest : scheme.surface,
      ),
    );

    if (variant == PerbugLogoVariant.markOnly) {
      return mark;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        const SizedBox(width: 10),
        Text(
          'Perbug',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _PerbugLogoPainter extends CustomPainter {
  _PerbugLogoPainter({
    required this.primary,
    required this.secondary,
    required this.background,
  });

  final Color primary;
  final Color secondary;
  final Color background;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(rect, Radius.circular(size.width * 0.28));

    canvas.drawRRect(
      rrect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [primary, secondary],
        ).createShader(rect),
    );

    final pPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.14
      ..strokeCap = StrokeCap.round
      ..color = background;

    final pPath = Path()
      ..moveTo(size.width * 0.34, size.height * 0.24)
      ..lineTo(size.width * 0.34, size.height * 0.76)
      ..moveTo(size.width * 0.34, size.height * 0.28)
      ..quadraticBezierTo(size.width * 0.78, size.height * 0.30, size.width * 0.70, size.height * 0.50)
      ..quadraticBezierTo(size.width * 0.62, size.height * 0.63, size.width * 0.34, size.height * 0.60);
    canvas.drawPath(pPath, pPaint);

    canvas.drawCircle(
      Offset(size.width * 0.76, size.height * 0.18),
      size.width * 0.06,
      Paint()..color = background,
    );
    canvas.drawLine(
      Offset(size.width * 0.68, size.height * 0.24),
      Offset(size.width * 0.74, size.height * 0.20),
      Paint()
        ..color = background
        ..strokeWidth = size.width * 0.035
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _PerbugLogoPainter oldDelegate) {
    return oldDelegate.primary != primary ||
        oldDelegate.secondary != secondary ||
        oldDelegate.background != background;
  }
}
