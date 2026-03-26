import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum DryadLogoVariant { markOnly, withWordmark }

class DryadLogo extends StatelessWidget {
  const DryadLogo({
    this.size = 48,
    this.variant = DryadLogoVariant.markOnly,
    this.brightness,
    super.key,
  });

  final double size;
  final DryadLogoVariant variant;
  final Brightness? brightness;

  static const _markAsset = 'assets/branding/dryad1.svg';
  static const _fullAsset = 'assets/branding/dryad.svg';

  @override
  Widget build(BuildContext context) {
    final bright = brightness ?? Theme.of(context).brightness;
    final assetName = variant == DryadLogoVariant.markOnly ? _markAsset : _fullAsset;

    return SvgPicture.asset(
      assetName,
      width: size,
      height: size,
      fit: BoxFit.contain,
      theme: SvgTheme(currentColor: bright == Brightness.dark ? Colors.white : Colors.black),
      placeholderBuilder: (_) => SizedBox.square(
        dimension: size,
        child: const Center(child: CircularProgressIndicator.adaptive()),
      ),
    );
  }
}
