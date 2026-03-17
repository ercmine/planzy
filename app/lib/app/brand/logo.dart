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
    final bright = brightness ?? Theme.of(context).brightness;
    final mark = CustomPaint(
      size: Size.square(size),
      painter: _PerbugLogoPainter(background: bright == Brightness.dark ? const Color(0xFF060A14) : null),
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
  _PerbugLogoPainter({this.background});

  final Color? background;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    if (background != null) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(size.width * 0.22)),
        Paint()..color = background!,
      );
    }

    final gradient = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF27C7FF), Color(0xFFFFAB2E)],
    ).createShader(rect);

    final stroke = Paint()
      ..shader = gradient
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.11
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final topArc = Path()
      ..moveTo(size.width * 0.15, size.height * 0.52)
      ..arcToPoint(
        Offset(size.width * 0.85, size.height * 0.52),
        radius: Radius.circular(size.width * 0.35),
        clockwise: false,
      );
    canvas.drawPath(topArc, stroke);

    final middleArc = Path()
      ..moveTo(size.width * 0.30, size.height * 0.52)
      ..arcToPoint(
        Offset(size.width * 0.70, size.height * 0.52),
        radius: Radius.circular(size.width * 0.20),
        clockwise: false,
      )
      ..arcToPoint(
        Offset(size.width * 0.30, size.height * 0.52),
        radius: Radius.circular(size.width * 0.20),
        clockwise: false,
      );
    canvas.drawPath(middleArc, stroke);

    final lowerArc = Path()
      ..moveTo(size.width * 0.30, size.height * 0.68)
      ..arcToPoint(
        Offset(size.width * 0.78, size.height * 0.68),
        radius: Radius.circular(size.width * 0.25),
        clockwise: true,
      );
    canvas.drawPath(lowerArc, stroke);

    canvas.drawLine(
      Offset(size.width * 0.28, size.height * 0.77),
      Offset(size.width * 0.28, size.height * 0.36),
      stroke,
    );

    final pCounter = Path()
      ..moveTo(size.width * 0.46, size.height * 0.47)
      ..lineTo(size.width * 0.58, size.height * 0.47)
      ..arcToPoint(
        Offset(size.width * 0.58, size.height * 0.64),
        radius: Radius.circular(size.width * 0.09),
      )
      ..lineTo(size.width * 0.46, size.height * 0.64);
    canvas.drawPath(pCounter, stroke);
  }

  @override
  bool shouldRepaint(covariant _PerbugLogoPainter oldDelegate) {
    return oldDelegate.background != background;
  }
}
