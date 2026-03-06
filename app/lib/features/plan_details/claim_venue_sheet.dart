import 'package:flutter/material.dart';

import '../../api/client.dart';
import '../../api/models.dart';

class ClaimVenueSheet extends StatefulWidget {
  final ApiClient apiClient;
  final String venueId;
  final String? provider;
  final String? planId;

  const ClaimVenueSheet({
    super.key,
    required this.apiClient,
    required this.venueId,
    this.provider,
    this.planId,
  });

  @override
  State<ClaimVenueSheet> createState() => _ClaimVenueSheetState();
}

class _ClaimVenueSheetState extends State<ClaimVenueSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  bool _loading = false;
  ClaimVenueResponse? _response;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2 || parts.first.isEmpty) {
      return '***';
    }
    final name = parts.first;
    final domain = parts.last;
    final visible = name.length <= 2 ? name.substring(0, 1) : name.substring(0, 2);
    return '$visible***@$domain';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await widget.apiClient.createVenueClaim(
        venueId: widget.venueId,
        contactEmail: _emailController.text.trim(),
        message: _messageController.text.trim().isEmpty ? null : _messageController.text.trim(),
        planId: widget.planId,
        provider: widget.provider,
      );
      setState(() {
        _response = response;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, bottomPadding + 16),
      child: _response != null
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Claim this venue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                const Text('Thanks! We\'ll email you with verification steps.'),
                const SizedBox(height: 8),
                Text('Claim ID: ${_response!.claimId}'),
                Text('Email: ${_maskEmail(_emailController.text.trim())}'),
              ],
            )
          : Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Claim this venue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Contact email'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      final text = (value ?? '').trim();
                      final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
                      if (text.isEmpty) {
                        return 'Email is required';
                      }
                      if (!regex.hasMatch(text)) {
                        return 'Enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _messageController,
                    decoration: const InputDecoration(labelText: 'Message (optional)'),
                    maxLines: 3,
                    maxLength: 400,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: Text(_loading ? 'Submitting...' : 'Submit claim'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
