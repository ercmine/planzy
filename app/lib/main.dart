import 'app/bootstrap.dart';
import 'core/env/env.dart';

Future<void> main() async {
  await runDryadApp(EnvFlavor.prod);
}
