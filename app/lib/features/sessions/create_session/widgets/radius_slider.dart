import 'package:flutter/material.dart';

class RadiusSlider extends StatelessWidget {
  const RadiusSlider({
    required this.radiusMeters,
    required this.onChanged,
    super.key,
  });

  final int radiusMeters;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final radiusKm = radiusMeters / 1000;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Radius: ${radiusKm.toStringAsFixed(0)} km'),
        Slider(
          min: 1,
          max: 50,
          divisions: 49,
          value: radiusKm.clamp(1, 50).toDouble(),
          label: '${radiusKm.toStringAsFixed(0)} km',
          onChanged: (value) => onChanged((value * 1000).round()),
        ),
      ],
    );
  }
}
