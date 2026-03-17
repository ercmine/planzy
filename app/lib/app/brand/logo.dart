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

    canvas.drawLine(
      Offset(size.width * 0.30, size.height * 0.84),
      Offset(size.width * 0.30, size.height * 0.16),
      stroke,
    );

    final bowl = Path()
      ..moveTo(size.width * 0.30, size.height * 0.20)
      ..arcToPoint(
        Offset(size.width * 0.74, size.height * 0.20),
        radius: Radius.circular(size.width * 0.24),
        clockwise: false,
      )
      ..arcToPoint(
        Offset(size.width * 0.74, size.height * 0.56),
        radius: Radius.circular(size.width * 0.21),
        clockwise: false,
      )
      ..lineTo(size.width * 0.30, size.height * 0.56);
    canvas.drawPath(bowl, stroke);

    final innerCounter = Path()
      ..moveTo(size.width * 0.44, size.height * 0.33)
      ..arcToPoint(
        Offset(size.width * 0.60, size.height * 0.33),
        radius: Radius.circular(size.width * 0.10),
        clockwise: false,
      )
      ..arcToPoint(
        Offset(size.width * 0.60, size.height * 0.47),
        radius: Radius.circular(size.width * 0.08),
        clockwise: false,
      )
      ..lineTo(size.width * 0.44, size.height * 0.47);
    canvas.drawPath(innerCounter, stroke);

    canvas.drawCircle(Offset(size.width * 0.30, size.height * 0.84), size.width * 0.03, Paint()..shader = gradient);
  }

  @override
  bool shouldRepaint(covariant _PerbugLogoPainter oldDelegate) {
    return oldDelegate.background != background;
  }
}
