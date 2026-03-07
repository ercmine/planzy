// iOS note: LSApplicationQueriesSchemes for tel is typically not required for launchUrl.
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'link_confirm_sheet.dart';
import 'link_types.dart';

class LinkLauncher {
  Future<void> openLink(
    BuildContext context, {
    required Uri uri,
    required LinkType type,
    required String planTitle,
    Future<void> Function()? onBeforeLaunch,
  }) async {
    if (!_isValid(uri: uri, type: type)) {
      _showError(context, 'Unsupported link type.');
      return;
    }

    final confirmed = await LinkConfirmSheet.show(
      context,
      type: type,
      planTitle: planTitle,
      uri: uri,
    );

    if (!confirmed) {
      return;
    }

    await onBeforeLaunch?.call();

    final canLaunch = await canLaunchUrl(uri);
    if (!canLaunch) {
      _showError(context, 'Could not open this link.');
      return;
    }

    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );

    if (!launched && context.mounted) {
      _showError(context, 'Failed to open link.');
    }
  }

  bool _isValid({required Uri uri, required LinkType type}) {
    if (type == LinkType.call) {
      return uri.scheme == 'tel';
    }

    return uri.scheme == 'http' || uri.scheme == 'https';
  }

  void _showError(BuildContext context, String message) {
    if (!context.mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}
