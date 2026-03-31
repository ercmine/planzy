// flutter run -t lib/main_stage.dart
import 'app/bootstrap.dart';
import 'core/env/env.dart';

Future<void> main() async {
  await runPerbugApp(EnvFlavor.stage);
}
