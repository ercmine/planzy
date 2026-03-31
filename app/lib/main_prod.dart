// flutter run -t lib/main_prod.dart
import 'app/bootstrap.dart';
import 'core/env/env.dart';

Future<void> main() async {
  await runPerbugApp(EnvFlavor.prod);
}
