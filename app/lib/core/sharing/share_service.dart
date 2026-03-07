import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

class ShareService {
  Future<void> shareText(String text, {String? subject}) {
    return Share.share(text, subject: subject);
  }

  Future<void> copyToClipboard(String text) {
    return Clipboard.setData(ClipboardData(text: text));
  }
}
