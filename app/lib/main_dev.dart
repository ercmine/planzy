// flutter run -t lib/main_dev.dart
import 'app/bootstrap.dart';
import 'core/env/env.dart';

Future<void> main() async {
  await runPerbugApp(EnvFlavor.dev);
}
