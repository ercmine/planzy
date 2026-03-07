import '../core/env/env.dart';

class ApiClient {
  const ApiClient({required this.envConfig});

  final EnvConfig envConfig;

  Uri buildUri(String path) {
    return Uri.parse('${envConfig.apiBaseUrl}$path');
  }
}
