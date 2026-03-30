import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/assets.dart';
import '../../core/identity/identity_provider.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../home/perbug_asset_models.dart';
import '../home/perbug_game_controller.dart';

const Size _entryArtSize = Size(1024, 1536);
const bool _showDebugHitBoxes = bool.fromEnvironment('PERBUG_SHOW_ENTRY_HITBOXES');

const _EntryButtonRegion _connectWalletRegion = _EntryButtonRegion(
  id: 'connect-wallet',
  semanticsLabel: 'Connect wallet',
  normalizedRect: Rect.fromLTWH(0.1738, 0.6692, 0.6524, 0.0736),
);

const _EntryButtonRegion _learnMoreRegion = _EntryButtonRegion(
  id: 'learn-more',
  semanticsLabel: 'Learn more',
  normalizedRect: Rect.fromLTWH(0.3281, 0.7461, 0.3477, 0.0534),
);

@immutable
class _EntryButtonRegion {
  const _EntryButtonRegion({
    required this.id,
    required this.semanticsLabel,
    required this.normalizedRect,
  });

  final String id;
  final String semanticsLabel;
  final Rect normalizedRect;

  Rect resolveIn(Rect imageRect) {
    return Rect.fromLTWH(
      imageRect.left + normalizedRect.left * imageRect.width,
      imageRect.top + normalizedRect.top * imageRect.height,
      normalizedRect.width * imageRect.width,
      normalizedRect.height * imageRect.height,
    );
  }
}

@immutable
class EntryHitTargetLayout {
  const EntryHitTargetLayout({
    required this.screenSize,
    this.safePadding = EdgeInsets.zero,
  });

  final Size screenSize;
  final EdgeInsets safePadding;

  Rect get imageRect {
    final safeRect = Offset(safePadding.left, safePadding.top) &
        Size(
          math.max(0, screenSize.width - safePadding.horizontal),
          math.max(0, screenSize.height - safePadding.vertical),
        );

    if (safeRect.width <= 0 || safeRect.height <= 0) {
      return Rect.zero;
    }

    final fitted = applyBoxFit(BoxFit.contain, _entryArtSize, safeRect.size);
    final fittedSize = fitted.destination;
    final dx = safeRect.left + (safeRect.width - fittedSize.width) / 2;
    final dy = safeRect.top + (safeRect.height - fittedSize.height) / 2;
    return Rect.fromLTWH(dx, dy, fittedSize.width, fittedSize.height);
  }

  Rect get connectWalletRect => _connectWalletRegion.resolveIn(imageRect);

  Rect get learnMoreRect => _learnMoreRegion.resolveIn(imageRect);
}

class PerbugWalletEntryPage extends ConsumerStatefulWidget {
  const PerbugWalletEntryPage({super.key});

  @override
  ConsumerState<PerbugWalletEntryPage> createState() => _PerbugWalletEntryPageState();
}

class _PerbugWalletEntryPageState extends ConsumerState<PerbugWalletEntryPage> {
  bool _restoring = true;
  bool _connecting = false;
  bool _startingDemo = false;
  bool _walletAvailable = true;
  String? _error;
  String? _pressedButtonId;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final connector = ref.read(walletConnectorProvider);
      _walletAvailable = connector.isAvailable;
      final store = await ref.read(identityStoreProvider.future);
      final authMode = await store.getAuthMode();
      final restored = await store.getWalletSessionAddress();
      if (!mounted) return;
      if (restored != null && restored.trim().isNotEmpty) {
        ref.read(walletAddressProvider.notifier).state = restored;
        ref.read(entryAuthModeProvider.notifier).state = EntryAuthMode.wallet;
        await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
          walletAddress: restored,
          status: AssetLinkStatus.linked,
        );
        if (!mounted) return;
        await _goToPostAuthStart();
        return;
      }
      if (authMode == 'demo') {
        ref.read(entryAuthModeProvider.notifier).state = EntryAuthMode.demo;
        await ref.read(perbugGameControllerProvider.notifier).setWalletLink(status: AssetLinkStatus.pendingSync);
        if (!mounted) return;
        await _goToPostAuthStart();
        return;
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Session restore failed. You can reconnect your wallet manually.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _restoring = false;
          if (!_walletAvailable) {
            _error = _error ??
                'No wallet provider detected here. You can still enter Demo Mode now.';
          }
        });
      }
    }
  }

  Future<void> _connectWallet({String? walletId}) async {
    final connector = ref.read(walletConnectorProvider);
    if (!connector.isAvailable) {
      if (!mounted) return;
      setState(() {
        _walletAvailable = false;
        _error = 'Wallet connection is unavailable in this environment. Enter Demo Mode to keep playing.';
      });
      return;
    }
    setState(() {
      _error = null;
      _connecting = true;
    });

    try {
      final account = await connector.connectWallet(walletId: walletId);
      if (!mounted) return;
      ref.read(walletAddressProvider.notifier).state = account;
      ref.read(entryAuthModeProvider.notifier).state = EntryAuthMode.wallet;
      final store = await ref.read(identityStoreProvider.future);
      await store.setAuthMode('wallet');
      await store.setWalletSessionAddress(account);
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
        walletAddress: account,
        status: AssetLinkStatus.linked,
      );
      if (!mounted) return;
      await _goToPostAuthStart();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not connect wallet: $error. You can still enter Demo Mode.';
      });
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
        status: AssetLinkStatus.failed,
      );
    } finally {
      if (mounted) {
        setState(() {
          _connecting = false;
        });
      }
    }
  }

  Future<void> _enterDemoMode() async {
    if (_restoring || _connecting || _startingDemo) return;
    setState(() {
      _startingDemo = true;
      _error = null;
    });
    try {
      final store = await ref.read(identityStoreProvider.future);
      await store.getOrCreateDemoSessionId();
      await store.setWalletSessionAddress(null);
      await store.setAuthMode('demo');
      ref.read(walletAddressProvider.notifier).state = null;
      ref.read(entryAuthModeProvider.notifier).state = EntryAuthMode.demo;
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(status: AssetLinkStatus.pendingSync);
      if (!mounted) return;
      await _goToPostAuthStart();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not start Demo Mode: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _startingDemo = false;
        });
      }
    }
  }

  Future<void> _runButtonAction({
    required String buttonId,
    required Future<void> Function() action,
  }) async {
    if (_restoring || _connecting) return;
    setState(() {
      _pressedButtonId = buttonId;
    });
    unawaited(
      Future<void>.delayed(const Duration(milliseconds: 220), () {
        if (!mounted || _pressedButtonId != buttonId) return;
        setState(() {
          _pressedButtonId = null;
        });
      }),
    );
    await action();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final layout = EntryHitTargetLayout(
      screenSize: media.size,
      safePadding: media.padding,
    );
    final artRect = layout.imageRect;

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Image.asset(
              AppAssets.perbugLoginBackdrop,
              fit: BoxFit.contain,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) => _EntryFallbackScreen(
                restoring: _restoring,
                connecting: _connecting,
                startingDemo: _startingDemo,
                error: _error,
                onConnectWallet: () => _runButtonAction(
                  buttonId: _connectWalletRegion.id,
                  action: () => _connectWallet(),
                ),
                onLearnMore: () => _runButtonAction(
                  buttonId: _learnMoreRegion.id,
                  action: () => _openLearnMore(),
                ),
                onPlayDemo: _enterDemoMode,
              ),
            ),
          ),
          if (artRect != Rect.zero)
            Positioned.fill(
              child: IgnorePointer(
                child: RepaintBoundary(
                  child: _EntryParticlesLayer(imageRect: artRect),
                ),
              ),
            ),
          if (artRect != Rect.zero)
            ...[
              _EntryHitButton(
                rect: layout.connectWalletRect,
                semanticsLabel: _connectWalletRegion.semanticsLabel,
                isDisabled: _restoring || _connecting || _startingDemo,
                isPressed: _pressedButtonId == _connectWalletRegion.id,
                onTap: () => _runButtonAction(
                  buttonId: _connectWalletRegion.id,
                  action: () => _connectWallet(),
                ),
              ),
              _EntryHitButton(
                rect: layout.learnMoreRect,
                semanticsLabel: _learnMoreRegion.semanticsLabel,
                isDisabled: _restoring || _connecting || _startingDemo,
                isPressed: _pressedButtonId == _learnMoreRegion.id,
                onTap: () => _runButtonAction(
                  buttonId: _learnMoreRegion.id,
                  action: () => _openLearnMore(),
                ),
              ),
            ],
          Positioned(
            left: 18,
            right: 18,
            bottom: 74 + media.padding.bottom,
            child: _EntryActionRail(
              disabled: _restoring || _connecting || _startingDemo,
              onConnectWallet: () => _runButtonAction(
                buttonId: _connectWalletRegion.id,
                action: () => _connectWallet(),
              ),
              onLearnMore: () => _runButtonAction(
                buttonId: _learnMoreRegion.id,
                action: () => _openLearnMore(),
              ),
              onUseMyLocation: _enterDemoMode,
            ),
          ),
          Positioned(
            left: 18,
            right: 18,
            bottom: 12 + media.padding.bottom,
            child: _DemoModeBar(
              disabled: _restoring || _connecting || _startingDemo,
              walletUnavailable: !_walletAvailable,
              onPlayDemo: _enterDemoMode,
            ),
          ),
          if (_showDebugHitBoxes && artRect != Rect.zero)
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _DebugHitBoxPainter(
                    connectRect: layout.connectWalletRect,
                    learnMoreRect: layout.learnMoreRect,
                  ),
                ),
              ),
            ),
          if (_error != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 16 + media.padding.bottom,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xB3231020),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x80FFA9B3)),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFFFFDFE5)),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }


  Future<void> _goToPostAuthStart() async {
    if (!mounted) return;
    context.go(AppRoutes.liveMap);
  }

  Future<void> _openLearnMore() async {
    if (!mounted) return;
    await context.push(AppRoutes.learnMore);
  }
}

class _EntryFallbackScreen extends StatelessWidget {
  const _EntryFallbackScreen({
    required this.restoring,
    required this.connecting,
    required this.startingDemo,
    required this.error,
    required this.onConnectWallet,
    required this.onLearnMore,
    required this.onPlayDemo,
  });

  final bool restoring;
  final bool connecting;
  final bool startingDemo;
  final String? error;
  final VoidCallback onConnectWallet;
  final VoidCallback onLearnMore;
  final VoidCallback onPlayDemo;

  @override
  Widget build(BuildContext context) {
    final disabled = restoring || connecting || startingDemo;
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF120A20), Color(0xFF261537), Color(0xFF56366D)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Perbug',
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  color: const Color(0xFFFFE2A6),
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'The entry artwork failed to load. You can still connect and continue.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white70),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: disabled ? null : onConnectWallet,
                child: Text(restoring ? 'Restoring session…' : 'Connect Wallet'),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: disabled ? null : onLearnMore,
                child: const Text('Learn More'),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: disabled ? null : onPlayDemo,
                child: Text(startingDemo ? 'Entering Demo Mode…' : 'Play Demo'),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFFFFD5D5)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _DemoModeBar extends StatelessWidget {
  const _DemoModeBar({
    required this.disabled,
    required this.walletUnavailable,
    required this.onPlayDemo,
  });

  final bool disabled;
  final bool walletUnavailable;
  final VoidCallback onPlayDemo;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0x8F110A19),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x60D2B6FF)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(walletUnavailable ? Icons.wifi_off_rounded : Icons.auto_awesome_rounded, color: const Color(0xFFD9CCFF), size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                walletUnavailable ? 'Wallet unavailable here. Enter Demo Mode.' : 'Skip wallet for now and enter Demo Mode.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFFE7DBFF)),
              ),
            ),
            TextButton(
              onPressed: disabled ? null : onPlayDemo,
              child: const Text('Play Demo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntryActionRail extends StatelessWidget {
  const _EntryActionRail({
    required this.disabled,
    required this.onConnectWallet,
    required this.onLearnMore,
    required this.onUseMyLocation,
  });

  final bool disabled;
  final VoidCallback onConnectWallet;
  final VoidCallback onLearnMore;
  final VoidCallback onUseMyLocation;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0x9311091A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x63BCA8FF)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            FilledButton.icon(
              onPressed: disabled ? null : onConnectWallet,
              icon: const Icon(Icons.account_balance_wallet_outlined),
              label: const Text('Connect Wallet'),
            ),
            OutlinedButton.icon(
              onPressed: disabled ? null : onLearnMore,
              icon: const Icon(Icons.auto_stories_outlined),
              label: const Text('Learn More'),
            ),
            TextButton.icon(
              onPressed: disabled ? null : onUseMyLocation,
              icon: const Icon(Icons.my_location_outlined),
              label: const Text('Use My Location'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntryHitButton extends StatelessWidget {
  const _EntryHitButton({
    required this.rect,
    required this.semanticsLabel,
    required this.isDisabled,
    required this.isPressed,
    required this.onTap,
  });

  final Rect rect;
  final String semanticsLabel;
  final bool isDisabled;
  final bool isPressed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final minimumSize = Size(
      math.max(rect.width, 44),
      math.max(rect.height, 44),
    );

    return Positioned(
      left: rect.left - (minimumSize.width - rect.width) / 2,
      top: rect.top - (minimumSize.height - rect.height) / 2,
      width: minimumSize.width,
      height: minimumSize.height,
      child: Semantics(
        button: true,
        enabled: !isDisabled,
        label: semanticsLabel,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: isDisabled ? null : onTap,
            borderRadius: BorderRadius.circular(24),
            splashFactory: InkSparkle.splashFactory,
            splashColor: const Color(0x4473D7FF),
            highlightColor: Colors.transparent,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                boxShadow: isPressed
                    ? [
                        BoxShadow(
                          color: const Color(0x6639D7FF),
                          blurRadius: 18,
                          spreadRadius: 0.8,
                        ),
                      ]
                    : const [],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EntryParticlesLayer extends StatefulWidget {
  const _EntryParticlesLayer({required this.imageRect});

  final Rect imageRect;

  @override
  State<_EntryParticlesLayer> createState() => _EntryParticlesLayerState();
}

class _EntryParticlesLayerState extends State<_EntryParticlesLayer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<_ParticleSeed> _seeds;

  @override
  void initState() {
    super.initState();
    final random = math.Random(41);
    _seeds = List<_ParticleSeed>.generate(
      28,
      (index) => _ParticleSeed(
        xNorm: random.nextDouble(),
        yNorm: random.nextDouble(),
        radius: 1.2 + random.nextDouble() * 2.8,
        speed: 0.03 + random.nextDouble() * 0.08,
        drift: random.nextDouble() * 0.11,
        phase: random.nextDouble() * math.pi * 2,
        hueShift: random.nextDouble(),
      ),
      growable: false,
    );
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return CustomPaint(
          painter: _EntryParticlePainter(
            progress: _controller.value,
            imageRect: widget.imageRect,
            seeds: _seeds,
          ),
        );
      },
    );
  }
}

@immutable
class _ParticleSeed {
  const _ParticleSeed({
    required this.xNorm,
    required this.yNorm,
    required this.radius,
    required this.speed,
    required this.drift,
    required this.phase,
    required this.hueShift,
  });

  final double xNorm;
  final double yNorm;
  final double radius;
  final double speed;
  final double drift;
  final double phase;
  final double hueShift;
}

class _EntryParticlePainter extends CustomPainter {
  const _EntryParticlePainter({
    required this.progress,
    required this.imageRect,
    required this.seeds,
  });

  final double progress;
  final Rect imageRect;
  final List<_ParticleSeed> seeds;

  @override
  void paint(Canvas canvas, Size size) {
    if (imageRect == Rect.zero) return;
    for (final seed in seeds) {
      final cycle = (progress + seed.speed + seed.phase / (math.pi * 2)) % 1;
      final wobble = math.sin((cycle * math.pi * 2) + seed.phase) * seed.drift;
      final rise = (seed.yNorm - cycle * 0.16).clamp(0.04, 0.97);

      final x = imageRect.left + (seed.xNorm + wobble) * imageRect.width;
      final y = imageRect.top + rise * imageRect.height;

      final color = Color.lerp(
            const Color(0x88A0E8FF),
            const Color(0x77FFD68C),
            seed.hueShift,
          )!
          .withOpacity(0.26 + 0.28 * math.sin(seed.phase + cycle * math.pi * 2).abs());

      final paint = Paint()
        ..color = color
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

      canvas.drawCircle(Offset(x, y), seed.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _EntryParticlePainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.imageRect != imageRect ||
        !listEquals(oldDelegate.seeds, seeds);
  }
}

class _DebugHitBoxPainter extends CustomPainter {
  const _DebugHitBoxPainter({
    required this.connectRect,
    required this.learnMoreRect,
  });

  final Rect connectRect;
  final Rect learnMoreRect;

  @override
  void paint(Canvas canvas, Size size) {
    final connectPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = const Color(0xCC26D7FF);
    final learnPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = const Color(0xCCFFD45D);

    canvas.drawRRect(RRect.fromRectAndRadius(connectRect, const Radius.circular(14)), connectPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(learnMoreRect, const Radius.circular(14)), learnPaint);
  }

  @override
  bool shouldRepaint(covariant _DebugHitBoxPainter oldDelegate) {
    return oldDelegate.connectRect != connectRect || oldDelegate.learnMoreRect != learnMoreRect;
  }
}
