import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('web shell includes rewarded claim sdk script exactly once', () async {
    final html = await File('web/index.html').readAsString();
    const scriptTag = "<script src='//libtl.com/sdk.js' data-zone='10822588' data-sdk='show_10822588'></script>";

    final matches = RegExp(RegExp.escape(scriptTag)).allMatches(html).length;
    expect(matches, 1);
  });
}
