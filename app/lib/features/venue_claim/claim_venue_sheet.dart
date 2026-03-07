import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../core/validation/email.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'claim_venue_controller.dart';
import 'claim_venue_state.dart';

class ClaimVenueSheet extends ConsumerStatefulWidget {
  const ClaimVenueSheet({
    required this.plan,
    super.key,
  });

  final Plan plan;

  @override
  ConsumerState<ClaimVenueSheet> createState() => _ClaimVenueSheetState();
}

class _ClaimVenueSheetState extends ConsumerState<ClaimVenueSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(claimVenueControllerProvider);
    final controller = ref.read(claimVenueControllerProvider.notifier);
    final insets = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, insets + 16),
      child: state.status == ClaimVenueStatus.success
          ? _buildSuccessState(context, state, controller)
          : Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Claim this venue',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: AppSpacing.s),
                  const Text(
                    'Are you the owner or manager? Submit your contact email and we\'ll send verification steps.',
                  ),
                  const SizedBox(height: AppSpacing.m),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Contact email'),
                    validator: (value) {
                      final email = (value ?? '').trim();
                      if (email.isEmpty) {
                        return 'Email is required';
                      }
                      if (!isValidEmail(email)) {
                        return 'Enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.s),
                  TextFormField(
                    controller: _messageController,
                    decoration: const InputDecoration(labelText: 'Message (optional)'),
                    minLines: 2,
                    maxLines: 3,
                    maxLength: 400,
                  ),
                  if (state.status == ClaimVenueStatus.error && state.errorMessage != null) ...[
                    const SizedBox(height: AppSpacing.s),
                    Text(
                      state.errorMessage!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.m),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.status == ClaimVenueStatus.submitting
                          ? null
                          : () async {
                              if (!_formKey.currentState!.validate()) {
                                return;
                              }
                              await controller.submitClaim(
                                plan: widget.plan,
                                email: _emailController.text,
                                message: _messageController.text,
                              );
                            },
                      child: state.status == ClaimVenueStatus.submitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Submit claim'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSuccessState(
    BuildContext context,
    ClaimVenueState state,
    ClaimVenueController controller,
  ) {
    final shortClaimId = state.lastClaimId == null
        ? '—'
        : state.lastClaimId!.length <= 8
            ? state.lastClaimId!
            : state.lastClaimId!.substring(0, 8);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Claim this venue',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.m),
        const Text('Thanks! We\'ll email you with verification steps.'),
        const SizedBox(height: AppSpacing.s),
        Text('Claim ID: $shortClaimId'),
        if (state.maskedEmail != null) Text('Email: ${state.maskedEmail}'),
        const SizedBox(height: AppSpacing.m),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              controller.reset();
              Navigator.of(context).pop();
            },
            child: const Text('Close'),
          ),
        ),
      ],
    );
  }
}
